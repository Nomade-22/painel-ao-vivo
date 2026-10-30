const byId = (id) => document.getElementById(id);
const input = byId('linkYoutube');
const loop = byId('loop');
const muted = byId('muted');
const volume = byId('volume');
const volumeLabel = byId('volumeLabel');
const status = byId('status');
const estado = byId('estado');
const urlObs = byId('urlObs');
urlObs.value = window.location.origin + '/youtube-obs.html';

let occupied = false;
let volumeTimer;

function message(text, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
}
function settings() {
  return {loop: loop.checked, muted: muted.checked, volume: Number(volume.value)};
}
function applyState(state) {
  if (state.videoId && !input.value.trim()) {
    input.value = 'https://www.youtube.com/watch?v=' + state.videoId;
  }
  loop.checked = state.loop !== false;
  muted.checked = Boolean(state.muted);
  volume.value = Number.isFinite(state.volume) ? state.volume : 65;
  volumeLabel.textContent = volume.value + '%';
  estado.textContent = state.videoId
    ? 'Visualizador: ' + (state.playing ? '▶ reproduzindo' : '⏸ pausado') + ' | Vídeo: ' + state.videoId
    : 'Visualizador: nenhum vídeo selecionado';
}
async function command(action, show = true) {
  if (occupied) return;
  occupied = true;
  const buttons = [byId('reproduzir'),byId('pausar'),byId('parar')];
  buttons.forEach(b => b.disabled = true);
  try {
    const body = {action, ...settings()};
    if (action === 'play') body.url = input.value.trim();
    const response = await fetch('/api/youtube',{
      method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || 'Erro HTTP ' + response.status);
    estado.textContent = data.videoId
      ? 'Visualizador: ' + (data.playing?'▶ reproduzindo':'⏸ pausado') + ' | Vídeo: ' + data.videoId
      : 'Visualizador: nenhum vídeo selecionado';
    if (show) {
      if (action === 'play') message('Comando enviado! Confira a reprodução na janela do YouTube/OBS.');
      if (action === 'pause') message('Reprodução pausada na janela do YouTube.');
      if (action === 'stop') message('Vídeo removido do visualizador.');
      if (action === 'settings') message('Volume, som e loop atualizados no visualizador.');
    }
  } catch(e) {
    message('Falha: ' + e.message,true);
  } finally {
    occupied = false;
    buttons.forEach(b => b.disabled = false);
  }
}
byId('reproduzir').addEventListener('click',()=>command('play'));
byId('pausar').addEventListener('click',()=>command('pause'));
byId('parar').addEventListener('click',()=>command('stop'));
input.addEventListener('keydown',(e)=>{if(e.key==='Enter')command('play')});
loop.addEventListener('change',()=>command('settings'));
muted.addEventListener('change',()=>command('settings'));
volume.addEventListener('input',()=>{
  volumeLabel.textContent=volume.value + '%';
  clearTimeout(volumeTimer);
  volumeTimer = setTimeout(()=>command('settings',false),350);
});
byId('copiar').addEventListener('click',async()=>{
  try{
    await navigator.clipboard.writeText(urlObs.value);
    message('URL do visualizador copiada! Cole em Fontes → Navegador no OBS.');
  }catch(e){
    urlObs.focus();urlObs.select();
    message('Selecione e copie a URL do campo para adicionar no OBS.');
  }
});
byId('abrir').addEventListener('click',()=>window.open(urlObs.value,'_blank','noopener'));
(async()=>{
  try{
    const response=await fetch('/api/youtube',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const state=await response.json();
    applyState(state);
    message('Conectado. Cole o link do YouTube e clique em Reproduzir.');
  }catch(e){
    message('Não foi possível consultar o estado do YouTube: '+e.message,true);
    estado.textContent='Sem conexão com o servidor';
  }
})();
