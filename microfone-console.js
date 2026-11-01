const $ = id => document.getElementById(id);
const STORAGE_KEY = 'painel-microfone-canal-v1';
const randomHex = length => Array.from(crypto.getRandomValues(new Uint8Array(length)), b => b.toString(16).padStart(2, '0')).join('');
let channel = localStorage.getItem(STORAGE_KEY);
if (!/^[a-f0-9]{48}$/.test(channel || '')) {
  channel = randomHex(24);
  localStorage.setItem(STORAGE_KEY, channel);
}
const receiverUrl = new URL('/microfone-obs.html', location.origin);
receiverUrl.searchParams.set('channel', channel);
$('microfoneUrl').value = receiverUrl.href;

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let peer = null;
let stream = null;
let session = '';
let heartbeat = null;
let answerTimer = null;
let connecting = false;
let stopped = false;
let meterTimer = null;
let audioContext = null;

function status(message) { $('microfoneStatus').textContent = message; }
function controls(active) {
  $('microfoneIniciar').disabled = active;
  $('microfoneSilenciar').disabled = !active;
  $('microfoneParar').disabled = !active;
}
function mute(isMuted) {
  if (stream) for (const track of stream.getAudioTracks()) track.enabled = !isMuted;
  $('microfoneSilenciar').textContent = isMuted ? '🔊 Reativar microfone' : '🔇 Silenciar';
  $('microfoneSilenciar').setAttribute('aria-pressed', String(isMuted));
  $('microfoneAtivo').textContent = isMuted ? 'Silenciado' : 'Ativo';
}
async function post(action, description) {
  const response = await fetch('/api/microfone', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, session, action, description })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Error(payload.erro || 'HTTP ' + response.status);
  }
}
function iceComplete(connection) {
  if (connection.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(Error('A conexão demorou demais para iniciar')); }, 12000);
    function check() {
      if (connection.iceGatheringState === 'complete') { cleanup(); resolve(); }
    }
    function cleanup() {
      clearTimeout(timeout);
      connection.removeEventListener('icegatheringstatechange', check);
    }
    connection.addEventListener('icegatheringstatechange', check);
    check();
  });
}
function startMeter(currentStream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(currentStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const bar = $('microfoneNivel');
    function measure() {
      analyser.getByteFrequencyData(samples);
      const average = samples.reduce((sum, n) => sum + n, 0) / samples.length;
      bar.value = Math.min(100, Math.round(average * 1.3));
      meterTimer = setTimeout(measure, 140);
    }
    measure();
  } catch { /* Medidor é opcional; transmissão continua funcionando. */ }
}
async function start() {
  if (connecting || peer || !navigator.mediaDevices?.getUserMedia) return;
  connecting = true;
  stopped = false;
  $('microfoneIniciar').disabled = true;
  status('Solicitando autorização do microfone…');
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    if (stopped) { for (const track of stream.getTracks()) track.stop(); stream = null; return; }
    session = randomHex(16);
    const active = new RTCPeerConnection(config);
    peer = active;
    for (const track of stream.getAudioTracks()) active.addTrack(track, stream);
    active.onconnectionstatechange = () => {
      if (peer !== active) return;
      const state = active.connectionState;
      if (state === 'connected') status('✅ Conectado ao OBS. Sua voz está sendo enviada!');
      if (state === 'disconnected') status('⚠️ Conexão instável. Verifique a internet.');
      if (state === 'failed') status('❌ Conexão bloqueada pela rede. Desligue e tente novamente.');
    };
    await active.setLocalDescription(await active.createOffer());
    status('Negociando conexão pela internet…');
    await iceComplete(active);
    if (stopped) return;
    await post('offer', active.localDescription);
    controls(true);
    mute(false);
    startMeter(stream);
    status('Aguardando o OBS do escritório responder…');
    heartbeat = setInterval(() => {
      if (peer === active && active.localDescription && !stopped) {
        post('heartbeat', active.localDescription).catch(() => status('⚠️ Falha de comunicação com o servidor.'));
      }
    }, 60000);
    const startedAt = Date.now();
    answerTimer = setInterval(async () => {
      if (peer !== active || stopped || active.remoteDescription) return;
      try {
        const response = await fetch('/api/microfone?channel=' + channel + '&side=sender', { cache: 'no-store' });
        if (!response.ok) throw Error('HTTP ' + response.status);
        const { answer } = await response.json();
        if (answer?.session === session) {
          clearInterval(answerTimer); answerTimer = null;
          await active.setRemoteDescription(answer.description);
          status('Conectando áudio ao OBS…');
        } else if (Date.now() - startedAt > 45000) {
          clearInterval(answerTimer); answerTimer = null;
          status('⚠️ Sem resposta do OBS. Verifique se a fonte Microfone remoto está aberta.');
        }
      } catch (error) { status('Falha ao receber resposta: ' + error.message); }
    }, 1200);
  } catch (error) {
    await stop();
    status('Não foi possível iniciar: ' + error.message);
  } finally {
    connecting = false;
    if (!peer) controls(false);
  }
}
async function stop() {
  stopped = true;
  clearInterval(heartbeat); heartbeat = null;
  clearInterval(answerTimer); answerTimer = null;
  clearTimeout(meterTimer); meterTimer = null;
  $('microfoneNivel').value = 0;
  if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
  if (peer) { peer.close(); peer = null; }
  if (stream) { for (const track of stream.getTracks()) track.stop(); stream = null; }
  const oldSession = session;
  session = '';
  controls(false);
  $('microfoneAtivo').textContent = 'Desligado';
  status('Microfone desligado.');
  if (oldSession) {
    try {
      await fetch('/api/microfone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, session: oldSession, action: 'stop' }),
        keepalive: true
      });
    } catch { /* O sinal expira automaticamente se a rede cair. */ }
  }
}
$('microfoneIniciar').addEventListener('click', start);
$('microfoneParar').addEventListener('click', stop);
$('microfoneSilenciar').addEventListener('click', () => {
  mute($('microfoneSilenciar').getAttribute('aria-pressed') !== 'true');
});
$('microfoneCopiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(receiverUrl.href);
    status('Link do OBS copiado. Configure uma fonte Navegador no computador do escritório.');
  } catch {
    $('microfoneUrl').focus();
    $('microfoneUrl').select();
    status('Selecione e copie o link acima para usar no OBS.');
  }
});
window.addEventListener('pagehide', () => {
  if (session) {
    const data = new Blob([JSON.stringify({ channel, session, action: 'stop' })], { type: 'application/json' });
    navigator.sendBeacon?.('/api/microfone', data);
  }
  if (stream) for (const track of stream.getTracks()) track.stop();
});
controls(false);
