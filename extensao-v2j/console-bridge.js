// Ponte local: só aceita um clique humano no botão do próprio console V2J.
document.addEventListener('click', async event => {
  const btn=event.target.closest?.('#v2jStartTikTokLive');
  if(!btn || !event.isTrusted)return;
  const status=document.getElementById('v2jStartLiveStatus');
  const report=value=>{if(status)status.textContent=value;};
  if(!window.confirm('Acionar “Iniciar LIVE” no TikTok Shop? Isso pode abrir etapas de confirmação no TikTok.'))return;
  btn.disabled=true;report('Localizando aba do Gerenciador de LIVE…');
  try{
    const answer=await chrome.runtime.sendMessage({type:'V2J_START_LIVE_REQUEST'});
    report(answer?.message || (answer?.ok?'Botão acionado no TikTok. Verifique a aba.':'Não foi possível acionar o TikTok.'));
  }catch(error){report('Falha de comunicação com a extensão: '+error.message);}
  finally{btn.disabled=false;}
},true);
