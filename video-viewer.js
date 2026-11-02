// Reprodução dupla para OBS e navegador: mantém o vídeo atual visível até o próximo ter um quadro renderizado.
// Compatível com as mesmas URLs video.html e video-obs.html.
const main=document.getElementById('video');
const backup=document.getElementById('videoBackup');
const mask=document.getElementById('videoMask');
const notice=document.getElementById('aviso');
const detail=document.getElementById('detalhe');
const manual=document.getElementById('reproduzirManual');
const onScreen=Boolean(manual);
const videoEndpoint='/api/video'; // As duas listas compartilham a mesma saída e o mesmo estado.
let playbackState=null,autoAdvancing=false,advanceGuard=null,advanceStartedAt=0;

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
 // Playlist avança pela aplicação, nunca pelo loop nativo do navegador/OBS.
 v.loop=s.mode==='playlist'?false:s.loop!==false;
 v.muted=s.muted!==false;
}
function playlistItems(s){
 const group=s?.playlistChannel==='youtube'?'youtube':'tiktok';
 return Array.isArray(s?.library)?s.library.filter(item=>(item.channel||'tiktok')===group):[];
}
function playlistNext(s){
 const items=playlistItems(s);
 if(!items.length)return null;
 const at=items.findIndex(item=>item.url===s.url);
 if(at<0)return items[0];
 if(at+1<items.length)return items[at+1];
 return s.playlistLoop!==false?items[0]:null;
}
// Prepara o próximo arquivo na janela de reserva, sem iniciar sua reprodução.
// A troca continua passando pelo mesmo canvas de transição já existente.
function preloadNext(s){
 if(!s || s.mode!=='playlist' || !s.playing || !active.getAttribute('src'))return;
 const entry=playlistNext(s);
 if(!entry || entry.url===s.url)return;
 const pane=standby();
 if(pane===active || pane.getAttribute('src')===entry.url)return;
 pane.pause();
 pane.loop=false;
 pane.muted=s.muted!==false;
 pane.controls=false;
 pane.preload='auto';
 pane.style.opacity='0.001';
 pane.style.zIndex='0';
 pane.style.pointerEvents='none';
 pane.src=entry.url;
 pane.load();
}
function tryAdvance(v,ended=false){
 if(v!==active || v.loop || autoAdvancing)return;
 const s=playbackState;
 if(!s || s.mode!=='playlist' || !s.playing)return;
 if(v.getAttribute('src')!==s.url || !v.getAttribute('src'))return;
 if(v.seeking && !ended)return;
 const duration=v.duration;
 const nearEnd=Number.isFinite(duration)&&duration>0
  && v.currentTime>=Math.max(0,duration-.25);
 // Não depender só de "ended": OBS pode perder o evento final, então conferimos
 // timeupdate, pause, seeking e um relógio periódico como alternativas.
 if(!ended && !v.ended && !nearEnd)return;
 const key=String(s.command)+'|'+s.url;
 if(advanceGuard===key && Date.now()-advanceStartedAt<12000)return;
 if(processing && !v.ended && !ended)return;
 advancePlaylist().catch(e=>show('Erro ao passar ao próximo vídeo: '+e.message,true));
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
 v.addEventListener('ended',()=>{
  if(v===active&&playbackState?.mode==='playlist')tryAdvance(v,true);
  else if(v===active)show('Vídeo concluído');
 });
 v.addEventListener('timeupdate',()=>tryAdvance(v));
 v.addEventListener('pause',()=>tryAdvance(v));
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
// A animação por opacity em <video> não é confiável no motor do OBS (CEF).
// Durante a troca, a mistura dos dois quadros é desenhada em um canvas.
// A renderização do canvas ocorre somente durante a transição para poupar CPU.
const transitionCanvas=document.createElement('canvas');
transitionCanvas.setAttribute('aria-hidden','true');
Object.assign(transitionCanvas.style,{
 position:'absolute',inset:'0',width:'100%',height:'100%',
 display:'none',pointerEvents:'none',zIndex:'20',background:'transparent'
});
document.getElementById('videoStage').appendChild(transitionCanvas);
const transitionCtx=transitionCanvas.getContext('2d',{alpha:true});
let transitionFrame=0;
function fitVideo(ctx,v,alpha,w,h){
 if(!v.videoWidth||!v.videoHeight||alpha<=0)return;
 const scale=Math.min(w/v.videoWidth,h/v.videoHeight);
 const dw=v.videoWidth*scale,dh=v.videoHeight*scale;
 ctx.save();
 ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
 ctx.drawImage(v,(w-dw)/2,(h-dh)/2,dw,dh);
 ctx.restore();
}
function canvasSize(){
 const rect=document.getElementById('videoStage').getBoundingClientRect();
 const realW=Math.max(1,Math.round(rect.width));
 const realH=Math.max(1,Math.round(rect.height));
 // No máximo 720p durante 0,3–2,5 s para não sobrecarregar PCs modestos.
 const scale=Math.min(1,1280/realW,720/realH);
 const w=Math.max(1,Math.round(realW*scale));
 const h=Math.max(1,Math.round(realH*scale));
 if(transitionCanvas.width!==w||transitionCanvas.height!==h){
  transitionCanvas.width=w;transitionCanvas.height=h;
 }
 return {w,h};
}
function paintTransition(old,next,p,mode,w,h){
 const ctx=transitionCtx;
 ctx.clearRect(0,0,w,h);
 if(mode==='black'){
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,w,h);
  if(p<=.5)fitVideo(ctx,old,1-p*2,w,h);
  else fitVideo(ctx,next,(p-.5)*2,w,h);
 }else{
  // Dissolvência real entre duas imagens. Nenhum elemento de vídeo é apagado.
  fitVideo(ctx,old,1,w,h);
  fitVideo(ctx,next,p,w,h);
 }
}
async function canvasBlend(old,next,ms,mode){
 if(!transitionCtx)return false;
 const {w,h}=canvasSize();
 // Primeiro quadro completo antes de apresentar o canvas, evitando piscar preto.
 paintTransition(old,next,0,mode,w,h);
 transitionCanvas.style.display='block';
 // Duração baseada no relógio real, com limite de ~30 desenhos/s.
 await new Promise(resolve=>{
  const start=performance.now();
  let previous=-Infinity;
  const draw=(now)=>{
   const fraction=Math.min(1,(now-start)/ms);
   if(now-previous>=31||fraction>=1){
    const smooth=fraction*fraction*(3-2*fraction);
    try{paintTransition(old,next,smooth,mode,w,h);}
    catch(err){
     console.warn('[Transição] Falha no canvas:',err);
     transitionFrame=0;
     resolve();
     return;
    }
    previous=now;
   }
   if(fraction>=1){transitionFrame=0;resolve();}
   else transitionFrame=requestAnimationFrame(draw);
  };
  transitionFrame=requestAnimationFrame(draw);
 });
 return true;
}
async function finishSwap(old,next,s){
 if(old===next){
  active.style.opacity='1';active.style.zIndex='2';
  active.controls=onScreen;
  active.style.pointerEvents=onScreen?'auto':'none';
  details('Arquivo: '+s.url.slice(0,160));
  show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
  preloadNext(s);
  return;
 }
 const ms=Math.max(300,Math.min(2500,Number(s.duration)||850));
 mask.style.transition='none';
 mask.style.opacity='0';
 old.style.transition='none';
 old.style.opacity='1';
 old.style.zIndex='2';
 next.style.transition='none';
 next.style.opacity='0.001';
 next.style.zIndex='3';
 await nextFrame();
 if(s.transition==='cut'){
  next.style.opacity='1';
  await nextFrame();
 }else{
  let usedCanvas=false;
  try{
   usedCanvas=await canvasBlend(old,next,ms,s.transition==='black'?'black':'fade');
  }catch(e){console.warn('[Transição] Usando fallback:',e);}
  if(!usedCanvas){
   // Fallback sem tela preta caso um navegador não disponibilize canvas 2D.
   next.style.transition='opacity '+ms+'ms ease-in-out';
   next.style.opacity='1';
   await sleep(ms+70);
  }else{
   // Próximo vídeo já está rodando atrás do último quadro do canvas.
   next.style.transition='none';
   next.style.opacity='1';
   await nextFrame();
  }
 }
 // O canvas só sai de cena depois que o novo vídeo já está visível.
 transitionCanvas.style.display='none';
 transitionCtx?.clearRect(0,0,transitionCanvas.width,transitionCanvas.height);
 active=next;
 old.pause();
 old.removeAttribute('src');
 old.load();
 old.style.transition='none';old.style.opacity='0';old.style.zIndex='0';
 old.controls=false;old.style.pointerEvents='none';
 active.style.transition='none';active.style.opacity='1';active.style.zIndex='2';
 active.controls=onScreen;
 active.style.pointerEvents=onScreen?'auto':'none';
 button(false);
 show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
 details('Arquivo: '+s.url.slice(0,160));
 preloadNext(s);
}
async function apply(s){
 playbackState=s;
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
  // Uma lista de um item também avança pelo servidor: reiniciar o mesmo
  // arquivo no começo, em vez de permanecer preso no último quadro.
  if(s.playing && s.mode==='playlist' && active.ended){
   try{active.currentTime=0;}catch{}
  }
  if(s.playing && active.paused)await startVideo(active,active,s);
  if(!s.playing)active.pause();
  show(s.playing?'Vídeo em reprodução':'Vídeo pausado');
  details('Arquivo: '+url.slice(0,160));
  preloadNext(s);
  return;
 }
 const old=active;
 const next=old.getAttribute('src')?standby():old;
 next.pause();
 if(next!==old)prepareNewPane(next);
 // Se o próximo arquivo já foi pré-carregado, não descartar seu buffer.
 if(next.getAttribute('src')!==url){
  next.src=url;
  next.preload='auto';
  next.load();
 }
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
// O avanço é escrito no servidor; assim console, OBS e prévias seguem na mesma posição.
async function advancePlaylist(){
 if(autoAdvancing || !playbackState || playbackState.mode!=='playlist' || !playbackState.playing)return;
 autoAdvancing=true;
 const current=playbackState;
 const key=String(current.command)+'|'+current.url;
 advanceGuard=key;
 advanceStartedAt=Date.now();
 const entry=playlistNext(current);
 // Troca local IMEDIATA sem depender da latência da API do servidor.
 // Enquanto o servidor confirma, ignoramos temporariamente um GET antigo.
 const optimistic={...current,url:entry?.url||current.url,playing:!!entry,
  command:Math.max(Date.now(),Number(current.command||0)+1)};
 revision=optimistic.command;
 playbackState=optimistic;
 schedule(optimistic);
 let synced=false;
 for(let attempt=0;attempt<3&&!synced;attempt++){
  try{
   const response=await fetch(videoEndpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'ended',command:current.command,url:current.url})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.erro||'HTTP '+response.status);
   if(data.command!==undefined){
    revision=data.command;
    // Outro controle pode ter mudado a lista enquanto a transição começava.
    if(data.ignored && (data.url!==optimistic.url || !data.playing!==!optimistic.playing)){
     playbackState=data;schedule(data);
    }else{
     playbackState={...data};
    }
    synced=true;
   }
  }catch(err){
   show('Sincronização da playlist: tentativa '+(attempt+1)+' — '+err.message,true);
   if(attempt<2)await sleep(900*(attempt+1));
  }
 }
 if(!synced){
  // A reprodução continua localmente até a conexão voltar.
  show('Próximo vídeo iniciado; aguardando sincronização com o servidor.',true);
 }
 autoAdvancing=false;
}
async function poll(){
 if(polling)return;
 polling=true;
 try{
  const r=await fetch(videoEndpoint,{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const s=await r.json();
  // Não reverter a imagem ao vídeo terminado enquanto o avanço local
  // aguarda resposta da função serverless.
  if(autoAdvancing && s.command===Number(advanceGuard?.split('|')[0]))return;
  if(s.command!==revision){revision=s.command;schedule(s);}
 }catch(e){show('Falha de sincronização: '+e.message,true);}
 finally{polling=false;}
}
poll();
setInterval(poll,1050);
setInterval(()=>tryAdvance(active),450);
