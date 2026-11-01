const stage=document.getElementById('cartasStage');
const layers=[document.getElementById('cartaA'),document.getElementById('cartaB')];
const notice=document.getElementById('cartasNotice');
let current=0,revision=null,first=true,queued=null,applying=false,polling=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const info=message=>{if(notice)notice.textContent=message;};
function configure(layer,s){
 layer.style.alignItems=s.position==='top'?'flex-start':s.position==='bottom'?'flex-end':'center';
 const img=layer.querySelector('img');img.style.maxWidth=(s.size||85)+'%';img.style.maxHeight=(s.size||85)+'%';
}
function preload(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  const timer=setTimeout(()=>{image.onload=image.onerror=null;reject(Error('A imagem demorou a carregar.'));},12000);
  image.onload=()=>{clearTimeout(timer);resolve();};
  image.onerror=()=>{clearTimeout(timer);reject(Error('Não foi possível abrir a imagem.'));};
  image.src=url;
 });
}
async function apply(s){
 const old=layers[current];
 if(!s.show||!s.url){
  layers.forEach(layer=>{layer.style.transition='opacity 250ms ease';layer.style.opacity='0';});
  info('Aguardando imagem do console…');return;
 }
 configure(old,s);
 if(old.querySelector('img').src===s.url){
  old.style.transition='opacity 200ms ease, transform 200ms ease';old.style.transform='none';old.style.opacity='1';
  info('Imagem exibida');return;
 }
 try{await preload(s.url);}catch(error){info(error.message);return;}
 const nextIndex=1-current,next=layers[nextIndex];configure(next,s);
 next.querySelector('img').src=s.url;
 const mode=s.transition||'fade',duration=Math.max(150,Math.min(2500,Number(s.duration)||800));
 next.style.transition='none';old.style.transition='none';
 next.style.opacity=mode==='cut'?'1':'0';
 next.style.transform=mode==='slide'?'translateX(24%)':mode==='zoom'?'scale(.76)':'none';
 next.style.zIndex='2';old.style.zIndex='1';
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(mode==='cut')old.style.opacity='0';
 else{
  next.style.transition=`opacity ${duration}ms ease,transform ${duration}ms ease`;
  old.style.transition=`opacity ${duration}ms ease,transform ${duration}ms ease`;
  next.style.opacity='1';next.style.transform='none';
  old.style.opacity='0';old.style.transform=mode==='slide'?'translateX(-20%)':mode==='zoom'?'scale(1.06)':'none';
  await sleep(duration+40);
 }
 old.style.transform='none';old.querySelector('img').removeAttribute('src');
 current=nextIndex;info('Imagem exibida');
}
function schedule(s){
 queued=s;if(applying)return;applying=true;
 (async()=>{while(queued){const next=queued;queued=null;try{await apply(next);}catch(e){info(e.message||'Erro ao exibir imagem');}}applying=false;})();
}
async function poll(){
 if(polling)return;polling=true;
 try{
  const r=await fetch('/api/cartas',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const s=await r.json();
  if(first||s.command!==revision){revision=s.command;first=false;schedule(s);}
 }catch(e){info('Sem sincronização: '+e.message);}
 finally{polling=false;}
}
poll();setInterval(poll,1000);
