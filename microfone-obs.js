const params = new URLSearchParams(location.search);
const channel = params.get('channel') || '';
const validChannel = /^[a-f0-9]{48}$/.test(channel);
const debug = params.get('debug') === '1';
if (debug) document.body.classList.add('debug');

const audio = document.getElementById('voz');
const info = document.getElementById('diagnostico');
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let peer = null;
let session = '';
let processing = false;

function show(message) {
  info.textContent = message;
  console.info('[Microfone remoto]', message);
}
async function api(side) {
  const response = await fetch('/api/microfone?channel=' + channel + '&side=' + side, { cache: 'no-store' });
  if (!response.ok) throw Error('HTTP ' + response.status);
  return response.json();
}
async function post(body) {
  const response = await fetch('/api/microfone', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, ...body })
  });
  if (!response.ok) throw Error('HTTP ' + response.status);
}
function reset() {
  if (peer) peer.close();
  peer = null;
  session = '';
  audio.pause();
  audio.srcObject = null;
}
function iceComplete(connection) {
  if (connection.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(Error('Tempo esgotado para negociar a conexão')); }, 12000);
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
async function accept(offer) {
  reset();
  session = offer.session;
  const active = new RTCPeerConnection(config);
  peer = active;
  active.ontrack = event => {
    if (peer !== active) return;
    audio.srcObject = event.streams[0] || new MediaStream([event.track]);
    audio.play().then(() => show('Áudio remoto recebido pelo OBS')).catch(error => {
      show('Reprodução bloqueada: ' + error.message);
    });
  };
  active.onconnectionstatechange = () => {
    if (peer !== active) return;
    if (active.connectionState === 'connected') show('Microfone conectado ✓');
    if (active.connectionState === 'failed') { reset(); show('Conexão falhou. Aguardando nova tentativa.'); }
  };
  await active.setRemoteDescription(offer.description);
  await active.setLocalDescription(await active.createAnswer());
  await iceComplete(active);
  await post({ action: 'answer', session, description: active.localDescription });
  show('Resposta enviada; aguardando áudio…');
}
async function poll() {
  if (!validChannel || processing) return;
  processing = true;
  try {
    const data = await api('receiver');
    if (data.offer?.session && data.offer.session !== session) {
      await accept(data.offer);
    } else if (!data.offer && session) {
      reset();
      show('Microfone desligado. Aguardando…');
    }
  } catch (error) {
    show('Sinalização: ' + error.message);
  } finally {
    processing = false;
  }
}
if (!validChannel) show('Link do microfone inválido. Copie novamente pelo console.');
else {
  show('Aguardando microfone do celular…');
  poll();
  setInterval(poll, 3500);
}
window.addEventListener('pagehide', reset);
