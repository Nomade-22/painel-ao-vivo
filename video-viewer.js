const player=document.getElementById('video'),aviso=document.getElementById('aviso');
let last=-1;
async function update(){
 try{
  const r=await fetch('/api/video',{cache:'no-store'});if(!r.ok)throw Error('API indisponivel');
  const s=await r.json();if(s.command===last)return;last=s.command;
  player.loop=s.loop;player.muted=s.muted;
  if(!s.url){player.pause();player.removeAttribute('src');player.load();if(aviso)aviso.textContent='Aguardando vídeo...';return;}
  if(player.getAttribute('src')!==s.url){player.src=s.url;player.load();}
  if(s.playing){try{await player.play();if(aviso)aviso.textContent='';}
   catch(e){if(aviso)aviso.textContent='Clique no vídeo para liberar reprodução com som. Alguns navegadores bloqueiam autoplay.';}}
  else{player.pause();if(aviso)aviso.textContent='Vídeo pausado';}
 }catch(e){if(aviso)aviso.textContent='Falha ao sincronizar vídeo';}
}
document.body.addEventListener('click',()=>{player.play().then(()=>{if(aviso)aviso.textContent='';}).catch(()=>{});});
update();setInterval(update,1200);