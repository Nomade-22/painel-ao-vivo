// Saída independente para OBS. Mantém o reprodutor legado inalterado.
(()=>{
 const stage=document.getElementById('stage');let signature='',playing=true;
 function media(item){
  const node=document.createElement(item.type==='page'?'iframe':item.type==='image'?'img':'video');
  node.src=item.url;node.style.objectFit=item.fit||'contain';
  if(node.tagName==='VIDEO'){
   node.autoplay=true;node.loop=item.loop!==false;node.playsInline=true;
   node.muted=!!item.muted;node.volume=Math.min(1,Math.max(0,Number(item.volume??100)/100));
   node.addEventListener('loadeddata',()=>{if(playing)node.play().catch(()=>{});});
  }
  if(node.tagName==='IFRAME'){node.referrerPolicy='no-referrer';node.allow='autoplay';}
  return node;
 }
 async function update(){
  try{
   const res=await fetch('/api/video?studio=1',{cache:'no-store'});if(!res.ok)return;
   const data=await res.json();const scene=data.scenes?.find(s=>s.id===data.activeScene);
   const items=(scene?.sources||[]).filter(s=>s.visible&&s.url);
   const next=JSON.stringify([data.activeScene,items]);
   playing=data.playing!==false;
   if(next!==signature){signature=next;stage.replaceChildren(...items.map(media));}
   for(const video of stage.querySelectorAll('video')){
    if(playing){if(video.paused)video.play().catch(()=>{});}else if(!video.paused)video.pause();
   }
  }catch{}
 }
 update();setInterval(update,1800);
})();
