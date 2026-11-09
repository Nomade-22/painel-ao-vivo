// Saída do V2J Studio para OBS; o reprodutor legado não é alterado.
(()=>{
 const stage=document.getElementById('stage');
 let signature='', playing=true, lastSeekCommand=null;
 const sendProgress=()=>{
  if(window.parent===window)return;
  const video=stage.querySelector('video');if(!video)return;
  window.parent.postMessage({source:'V2J_STUDIO_PLAYER',type:'PROGRESS',sourceId:video.dataset.sourceId,currentTime:video.currentTime||0,duration:Number.isFinite(video.duration)?video.duration:0},location.origin);
 };
 function media(item){
  const node=document.createElement(item.type==='page'?'iframe':item.type==='image'?'img':'video');
  node.src=item.url;node.dataset.sourceId=item.id;node.style.objectFit=item.fit||'contain';
  if(node.tagName==='VIDEO'){
   node.autoplay=true;node.playsInline=true;
   node.addEventListener('loadedmetadata',sendProgress);
   node.addEventListener('timeupdate',sendProgress);
   node.addEventListener('loadeddata',()=>{if(playing)node.play().catch(()=>{});});
  }
  if(node.tagName==='IFRAME'){node.referrerPolicy='no-referrer';node.allow='autoplay';}
  configure(node,item);
  return node;
 }
 function configure(node,item){
  node.style.objectFit=item.fit||'contain';
  if(node.tagName==='VIDEO'){
   node.loop=item.loop!==false;
   node.muted=!!item.muted;
   node.volume=Math.min(1,Math.max(0,Number(item.volume??100)/100));
  }
 }
 async function update(){
  try{
   const res=await fetch('/api/video?studio=1',{cache:'no-store'});if(!res.ok)return;
   const data=await res.json();const scene=data.scenes?.find(s=>s.id===data.activeScene);
   const items=(scene?.sources||[]).filter(s=>s.visible&&s.url);
   const next=JSON.stringify([data.activeScene,items.map(i=>[i.id,i.type,i.url])]);
   playing=data.playing!==false;
   if(next!==signature){signature=next;stage.replaceChildren(...items.map(media));}
   const byId=new Map(items.map(i=>[i.id,i]));
   for(const node of stage.children){const item=byId.get(node.dataset.sourceId);if(item)configure(node,item);}
   const seek=data.seek;
   if(seek&&seek.command!==lastSeekCommand){
    const video=[...stage.querySelectorAll('video')].find(v=>v.dataset.sourceId===seek.sourceId);
    if(video&&Number.isFinite(video.duration)&&video.duration>0){
     video.currentTime=Math.min(video.duration,Math.max(0,seek.seconds));
     lastSeekCommand=seek.command;sendProgress();
    }
   }
   for(const video of stage.querySelectorAll('video')){
    if(playing){if(video.paused&&!video.ended)video.play().catch(()=>{});}else if(!video.paused)video.pause();
   }
   sendProgress();
  }catch{}
 }
 update();setInterval(update,1800);
})();
