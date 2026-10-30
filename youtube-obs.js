const container = document.getElementById('yt-container');
const info = document.getElementById('message');
let player = null;
let ready = false;
let apiReady = false;
let currentVideoId = '';
let state = null;
let lastCommand = null;
let loading = false;
let connectionFailed = false;

function notice(text) {
  info.textContent = text;
  info.hidden = !text;
}
function playerError(errorCode) {
  if (errorCode === 101 || errorCode === 150) return 'O proprietário deste vídeo não permite reprodução incorporada. Escolha outro vídeo.';
  if (errorCode === 100) return 'Vídeo não encontrado ou indisponível no YouTube.';
  if (errorCode === 2) return 'O endereço do vídeo é inválido.';
  if (errorCode === 5) return 'O player não conseguiu reproduzir este vídeo no navegador incorporado.';
  if (errorCode === 153) return 'O YouTube não identificou a origem do player (erro 153). Verifique as configurações da fonte Navegador do OBS.';
  return 'O YouTube não conseguiu reproduzir este vídeo (erro ' + errorCode + ').';
}
function updateSettings() {
  if (!player || !ready || !state) return;
  player.setVolume(state.volume);
  if (state.muted) player.mute();
  else player.unMute();
}
function updatePlayback() {
  if (!player || !ready || !state) return;
  updateSettings();
  if (state.playing) {
    player.playVideo();
  } else {
    player.pauseVideo();
    notice('Vídeo pausado pelo painel de controle.');
  }
}
function clearPlayer() {
  if (player) {
    try { player.destroy(); } catch (e) { console.warn('YouTube player:',e); }
  }
  player = null;
  ready = false;
  currentVideoId = '';
  container.replaceChildren();
  const node = document.createElement('div');
  node.id = 'yt-player';
  container.appendChild(node);
}
function createPlayer(videoId) {
  clearPlayer();
  currentVideoId = videoId;
  if (!apiReady || !window.YT || !YT.Player) return;
  notice('Carregando vídeo do YouTube…');
  player = new YT.Player('yt-player',{
    width:'100%',
    height:'100%',
    videoId,
    playerVars:{
      autoplay:0,
      controls:1,
      playsinline:1,
      rel:0,
      enablejsapi:1,
      origin:window.location.origin
    },
    events:{
      onReady:() => {
        ready=true;
        updateSettings();
        updatePlayback();
      },
      onStateChange:event => {
        if (event.data === YT.PlayerState.PLAYING) notice('');
        if (event.data === YT.PlayerState.BUFFERING) notice('Carregando o vídeo…');
        if (event.data === YT.PlayerState.ENDED) {
          if (state && state.loop && state.playing) {
            event.target.seekTo(0,true);
            event.target.playVideo();
          } else {
            notice('O vídeo terminou. Ative Loop infinito no painel para repetir.');
          }
        }
      },
      onAutoplayBlocked:() => notice('O navegador bloqueou a reprodução automática. No OBS, clique com o botão direito na fonte Navegador, escolha Interagir e dê Play no YouTube.'),
      onError:event => notice(playerError(event.data))
    }
  });
}
function applyState(next) {
  const updated = !state || next.command !== lastCommand;
  state = next;
  if (!updated) return;
  lastCommand = next.command;
  if (!next.videoId) {
    clearPlayer();
    notice('Aguardando um link no painel de controle do YouTube…');
    return;
  }
  if (!apiReady) {
    notice('Conectando ao player oficial do YouTube…');
    return;
  }
  if (currentVideoId !== next.videoId || !player) {
    createPlayer(next.videoId);
    return;
  }
  updatePlayback();
}
window.onYouTubeIframeAPIReady = function() {
  apiReady=true;
  if (state && state.videoId && !player) createPlayer(state.videoId);
};
async function sync() {
  if (loading) return;
  loading=true;
  try {
    const response = await fetch('/api/youtube',{cache:'no-store'});
    if (!response.ok) throw new Error('HTTP '+response.status);
    const next = await response.json();
    if (connectionFailed) { connectionFailed=false; notice(''); }
    applyState(next);
  } catch(e) {
    connectionFailed=true;
    notice('Falha ao conectar ao painel YouTube: '+e.message);
  } finally {
    loading=false;
  }
}
sync();
setInterval(sync,1300);
