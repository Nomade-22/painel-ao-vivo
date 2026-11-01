// Reprodutor remoto: o endereco da pagina permanece o mesmo ao trocar o video.
const main=document.getElementById('video');
const backup=document.getElementById('videoBackup');
const mask=document.getElementById('videoMask');
const notice=document.getElementById('aviso');
const detail=document.getElementById('detalhe');
const manual=document.getElementById('reproduzirManual');
const onScreen=Boolean(manual);
const stage=document.getElementById('videoStage');
let active=main,revision=null,queued=null,processing=false,polling=false,manualPending=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const show=(message,error=false)=>{
 if(notice){notice.textContent=message;notice.style.color=error?'#ff9999':'#dfe7fb';}
 else if(error)console.error('[Reprodutor OBS]',message);
};
const details=message=>{if(detail)detail.textContent=message||'';};
const button=visible=>{if(manual)manual.hidden=!visible;};
function explainError(v){
 if(v.error?.code===4)return 'O link não aponta para um MP4/WebM compatível ou o servidor bloqueou o vídeo.';
 if(v.error?.code===3)return 'Não foi possível decodificar o vídeo. Tente MP4 H.264 (720p).';
 if(v.error?.code===2)return 'Erro de rede. Verifique o link e a conexão.';
 return 'Não foi possível carregar o vídeo. Confira o arquivo.';
}
for(const v of [main,backup]){
 v.playsInline=true;
 v.style.opacity=v===main?'1':'0';
 v.style.zIndex=v===main?'1':'0';
 v.controls=onScreen&&v===main;
 v.style.pointerEvents=onScreen&&v===main?'auto':'none';
 v.addEventListener('error',()=>{if(v.getAttribute('src'))show(explainError(v),true);});
 v.addEventListener('waiting',()=>{if(v===active && !v.paused)show('Carregando dados do vídeo…');});
 v.addEventListener('playing',()=>{if(v===active){show('Vídeo em reprodução');button(false);}});
 v.addEventListener('ended',()=>{if(v===active&&!v.loop)show('Vídeo concluído');});
}
function configVideo(v,s){v.loop=s.loop!==false;v.muted=s.muted!==false;}
function waitReady(v){
 if(v.readyState>=2)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let done=false;
  const clear=()=>{v.removeEventListener('loadeddata',ready);v.removeEventListener('error',fail);clearTimeout(timer);};
  const ready=()=>{if(done)return;done=true;clear();resolve();};
  const fail=()=>{if(done)return;done=true;clear();reject(new Error(explainError(v)));};
  const timer=setTimeout(()=>{if(done)return;done=true;clear();reject(new Error('O próximo vídeo demorou para carregar. O atual foi mantido.'));},16000);
  v.addEventListener('loadeddata',ready);
  v.addEventListener('error',fail);
  if(v.readyState>=2)ready();
 });
}
async function tryPlay(v,old,s){
 try{await v.play();button(false);return true;}
 catch(e){
  manualPending={v,old,s};
  show('Reprodução automática bloqueada. Clique em "Iniciar vídeo" na página do reprodutor.',true);
  button(true);
  return false;
 }
}
async function finishSwap(old,next,s){
 const ms=s.transition==='cut'?0:Math.max(300,Math.min(2500,Number(s.duration)||850));
 if(old!==next){
  next.style.transition='none';
  next.style.opacity='0';
  next.style.zIndex='2';
  next.style.pointerEvents='none';
  old.style.zIndex='1';
  if(s.transition==='black'){
   const half=Math.max(150,Math.round(ms/2));
   mask.style.transition='opacity '+half+'ms ease';
   await nextFrame();
   mask.style.opacity='1';
   await sleep(half+30);
   old.style.transition='none';old.style.opacity='0';
   next.style.transition='none';next.style.opacity='1';
   await nextFrame();
   mask.style.opacity='0';
   await sleep(half+30);
  }else if(s.transition==='cut'){
   old.style.transition='none';old.style.opacity='0';
   next.style.opacity='1';
  }else{
   await nextFrame();
   old.style.transition='opacity '+ms+'ms ease-in-out';
   next.style.transition='opacity '+ms+'ms ease-in-out';
   old.style.opacity='0';next.style.opacity='1';
   await sleep(ms+60);
  }
  old.pause();old.removeAttribute('src');old.load();
  old.style.transition='none';old.style.opacity='0';old.style.zIndex='0';
  old.controls=false;old.style.pointerEvents='none';
  active=next;
 }
 active.style.transition='none';active.style.opacity='1';active.style.zIndex='1';
 active.controls=onScreen;active.style.pointerEvents=onScreen?'auto':'none';
 mask.style.opacity='0';button(false);
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
  }
  mask.style.opacity='0';button(false);show('Aguardando vídeo do console…');details('');return;
 }
 let parsed;
 try{parsed=new URL(url);if(parsed.protocol!=='https:' || /(^|\.)(youtube\.com|youtu\.be)$/.test(parsed.hostname))throw Error('URL inválida');}
 catch{show('Use um link HTTPS direto para um arquivo MP4/WebM.',true);return;}
 for(const v of [main,backup])configVideo(v,s);
 if(active.getAttribute('src')===url){
  if(s.playing && active.paused)await tryPlay(active,active,s);
  if(!s.playing)active.pause();
  show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
  details('Arquivo: '+url.slice(0,160));
  return;
 }
 const previous=active;
 const next=previous.getAttribute('src')?(previous===main?backup:main):previous;
 next.pause();next.style.transition='none';
 if(next!==previous){next.style.opacity='0';next.style.zIndex='0';}
 next.src=url;next.preload='auto';next.load();
 show(next===previous?'Abrindo vídeo…':'Preparando próximo vídeo (atual continua no ar)…');
 try{
  await waitReady(next);
  if(s.playing && !(await tryPlay(next,previous,s)))return;
  if(!s.playing)next.pause();
  await finishSwap(previous,next,s);
 }catch(e){
  if(next!==previous){next.pause();next.removeAttribute('src');next.load();}
  show(e.message||'Falha ao abrir o próximo vídeo.',true);
 }
}
function schedule(s){
 queued=s;
 if(processing)return;
 processing=true;
 (async()=>{
  while(queued){
   const current=queued;queued=null;
   try{await apply(current);}catch(e){show('Erro de reprodução: '+e.message,true);}
  }
  processing=false;
 })();
}
if(manual)manual.onclick=async()=>{
 const pending=manualPending;
 if(pending){
  try{await pending.v.play();manualPending=null;await finishSwap(pending.old,pending.v,pending.s);}
  catch(e){show('Não foi possível iniciar: '+e.message,true);}
 }else{
  try{await active.play();show('Vídeo em reprodução');button(false);}
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
