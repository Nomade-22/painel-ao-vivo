// Reprodução dupla para OBS e navegador: mantém o vídeo atual visível até o próximo ter um quadro renderizado.
// Compatível com as mesmas URLs video.html e video-obs.html.
const main=document.getElementById('video');
const backup=document.getElementById('videoBackup');
const mask=document.getElementById('videoMask');
const notice=document.getElementById('aviso');
const detail=document.getElementById('detalhe');
const manual=document.getElementById('reproduzirManual');
const onScreen=Boolean(manual);

let active=main;
let revision=null,queued=null,processing=false,polling=false,manualPending=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

const show=(message,error=false)=>{
 if(notice){notice.textContent=message;notice.style.color=error?'#ff9999':'#dfe7fb';}
 else if(error)console.error('[Vídeo OBS]',message);
};
const details=message=>{if(detail)detail.textContent=message||'';};
const button=visible=>{if(manual)manual.hidden=!visible;};
function explainError(v){
 if(v.error?.code===4)return 'O arquivo não é compatível (use MP4 H.264 ou WebM) ou está bloqueado.';
 if(v.error?.code===3)return 'Falha de decodificação. Prefira MP4 H.264 (720p).';
 if(v.error?.code===2)return 'Falha de rede. Verifique o link.';
 return 'Não foi possível carregar o vídeo.';
}
const standby=()=>active===main?backup:main;
function setVideo(v,s){
 v.loop=s.loop!==false;
 v.muted=s.muted!==false;
}
for(const v of [main,backup]){
 v.playsInline=true;
 v.style.transition='none';
 v.style.opacity=v===active?'1':'0';
 v.style.zIndex=v===active?'2':'0';
 v.controls=onScreen&&v===active;
 v.style.pointerEvents=onScreen&&v===active?'auto':'none';
 v.addEventListener('error',()=>{
  if(v.getAttribute('src')&&v===active)show(explainError(v),true);
 });
 v.addEventListener('waiting',()=>{if(v===active&&!v.paused)show('Aguardando dados do vídeo…');});
 v.addEventListener('playing',()=>{if(v===active){show('Vídeo em reprodução');button(false);}});
 v.addEventListener('ended',()=>{if(v===active&&!v.loop)show('Vídeo concluído');});
}

// loadeddata pode ocorrer antes de haver um quadro realmente desenhado na tela do OBS.
function waitReady(v){
 if(v.readyState>=2 && v.videoWidth>0)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let done=false;
  const clean=()=>{clearTimeout(timer);v.removeEventListener('loadeddata',ready);v.removeEventListener('error',fail);};
  const ready=()=>{if(done||v.videoWidth===0)return;done=true;clean();resolve();};
  const fail=()=>{if(done)return;done=true;clean();reject(new Error(explainError(v)));};
  const timer=setTimeout(()=>{if(done)return;done=true;clean();reject(new Error('O novo vídeo demorou a carregar; o anterior continua na tela.'));},16000);
  v.addEventListener('loadeddata',ready);
  v.addEventListener('error',fail);
  if(v.readyState>=2)ready();
 });
}
async function waitFirstFrame(v,playing){
 if(!playing){
  // Para imagens pausadas, loadeddata garante o quadro inicial decodificado.
  await nextFrame();
  return;
 }
 // requestVideoFrameCallback confirma que o navegador recebeu um quadro do novo vídeo.
 if(typeof v.requestVideoFrameCallback==='function'){
  const gotFrame=await new Promise(resolve=>{
   let settled=false;
   const timer=setTimeout(()=>{if(!settled){settled=true;resolve(false);}},5000);
   v.requestVideoFrameCallback((_time,meta)=>{
    if(settled)return;
    settled=true;clearTimeout(timer);
    resolve(meta?.presentedFrames>0);
   });
  });
  if(gotFrame){await nextFrame();return;}
 }
 // Fallback para versões antigas do Chromium/OBS: não trocar antes de a mídia avançar.
 if(v.readyState<3 && v.currentTime<=0)throw new Error('O novo vídeo ainda não exibiu imagens. Mantivemos o anterior.');
 await sleep(260);
 await nextFrame();
}
async function startVideo(v,old,s){
 try{
  await v.play();
  button(false);
  return true;
 }catch(e){
  manualPending={v,old,s};
  show('Autoplay bloqueado. Clique em "Iniciar vídeo" no reprodutor.',true);
  button(true);
  return false;
 }
}
function prepareNewPane(next){
 // O quadro novo é renderizado com opacidade quase zero, sobre o vídeo antigo.
 // Isso evita que o navegador suspenda a composição de um elemento com opacity:0.
 next.style.transition='none';
 next.style.opacity='0.001';
 next.style.zIndex='3';
 next.style.pointerEvents='none';
 next.controls=false;
}
async function finishSwap(old,next,s){
 if(old===next){
  active.style.opacity='1';active.style.zIndex='2';
  active.controls=onScreen;
  active.style.pointerEvents=onScreen?'auto':'none';
  details('Arquivo: '+s.url.slice(0,160));
  show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
  return;
 }
 const ms=Math.max(300,Math.min(2500,Number(s.duration)||850));
 old.style.transition='none';
 old.style.opacity='1';old.style.zIndex='2';
 next.style.transition='none';
 next.style.opacity='0.001';next.style.zIndex='3';
 await nextFrame();
 if(s.transition==='black'){
  // Só passa pelo preto se esse efeito foi explicitamente escolhido.
  const half=Math.max(150,Math.round(ms/2));
  mask.style.transition='opacity '+half+'ms ease-in-out';
  mask.style.opacity='1';
  await sleep(half+40);
  next.style.opacity='1';
  mask.style.opacity='0';
  await sleep(half+40);
 }else if(s.transition==='cut'){
  next.style.opacity='1';
  await nextFrame();
 }else{
  // Dissolver: não apagar o vídeo antigo! Apenas revelar o novo por cima.
  next.style.transition='opacity '+ms+'ms ease-in-out';
  next.style.opacity='1';
  await sleep(ms+70);
 }
 // Somente agora o vídeo anterior é pausado e descarregado.
 active=next;
 old.pause();
 old.removeAttribute('src');
 old.load();
 old.style.transition='none';old.style.opacity='0';old.style.zIndex='0';
 old.controls=false;old.style.pointerEvents='none';
 active.style.transition='none';active.style.opacity='1';active.style.zIndex='2';
 active.controls=onScreen;
 active.style.pointerEvents=onScreen?'auto':'none';
 mask.style.transition='none';mask.style.opacity='0';
 button(false);
 show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
 details('Arquivo: '+s.url.slice(0,160));
}
async function apply(s){
 manualPending=null;
 const url=typeof s.url==='string'?s.url:'';
 if(!url){
  for(const v of [main,backup]){
   v.pause();v.removeAttribute('src');v.load();
   v.style.transition='none';v.style.opacity=v===active?'1':'0';
   v.style.zIndex=v===active?'2':'0';
  }
  mask.style.opacity='0';
  button(false);show('Aguardando vídeo do console…');details('');
  return;
 }
 try{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||/(^|\.)(youtube\.com|youtu\.be)$/.test(parsed.hostname))throw Error('URL inválida');
 }catch{
  show('Use um endereço HTTPS de MP4/WebM.',true);return;
 }
 for(const v of [main,backup])setVideo(v,s);
 if(active.getAttribute('src')===url){
  if(s.playing && active.paused)await startVideo(active,active,s);
  if(!s.playing)active.pause();
  show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
  details('Arquivo: '+url.slice(0,160));
  return;
 }
 const old=active;
 const next=old.getAttribute('src')?standby():old;
 next.pause();
 if(next!==old)prepareNewPane(next);
 next.src=url;
 next.preload='auto';
 next.load();
 show(next===old?'Iniciando vídeo…':'Preparando próximo vídeo; o anterior permanece no ar…');
 try{
  await waitReady(next);
  if(s.playing && !(await startVideo(next,old,s)))return;
  if(!s.playing)next.pause();
  await waitFirstFrame(next,!!s.playing);
  // Se já solicitaram outro arquivo, não mostramos um vídeo intermediário.
  if(queued&&queued.url!==url && next!==old){
   next.pause();next.removeAttribute('src');next.load();
   next.style.opacity='0';next.style.zIndex='0';
   return;
  }
  await finishSwap(old,next,s);
 }catch(e){
  if(next!==old){
   next.pause();next.removeAttribute('src');next.load();
   next.style.transition='none';next.style.opacity='0';next.style.zIndex='0';
  }
  show(e.message||'Não foi possível preparar o vídeo.',true);
 }
}
function schedule(s){
 queued=s;
 if(processing)return;
 processing=true;
 (async()=>{
  while(queued){
   const current=queued;queued=null;
   try{await apply(current);}catch(e){show('Falha de reprodução: '+e.message,true);}
  }
  processing=false;
 })();
}
if(manual)manual.onclick=async()=>{
 const pending=manualPending;
 if(pending){
  try{
   await pending.v.play();
   await waitFirstFrame(pending.v,true);
   manualPending=null;
   await finishSwap(pending.old,pending.v,pending.s);
  }catch(e){show('Não foi possível iniciar: '+e.message,true);}
 }else{
  try{await active.play();button(false);show('Vídeo em reprodução');}
  catch(e){show('Não foi possível iniciar: '+e.message,true);}
 }
};
async function poll(){
 if(polling)return;
 polling=true;
 try{
  const r=await fetch('/api/video',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const s=await r.json();
  if(s.command!==revision){revision=s.command;schedule(s);}
 }catch(e){show('Falha de sincronização: '+e.message,true);}
 finally{polling=false;}
}
poll();
setInterval(poll,1050);
