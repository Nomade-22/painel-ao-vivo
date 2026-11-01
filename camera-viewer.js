// Reprodutor exclusivo da câmera. Nunca consulta /api/video nem altera vídeos gravados.
const frame=document.getElementById('cameraRemoteFrame');
const status=document.getElementById('cameraViewerStatus');
let lastKey=null;
let polling=false;
const say=msg=>{if(status)status.textContent=msg;};
function sourceUrl(id,audio){
 const qs=new URLSearchParams({view:id});
 return 'https://vdo.ninja/?'+qs.toString()+'&cleanoutput&transparent'+(audio?'':'&noaudio');
}
function apply(s){
 const id=typeof s.cameraId==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(s.cameraId)?s.cameraId:'';
 const enabled=s.enabled===true&&!!id;
 const key=enabled?id+'|'+!!s.audio:'disabled';
 if(key===lastKey)return;
 lastKey=key;
 if(!enabled){
  frame.hidden=true;
  frame.removeAttribute('src');
  say(id?'Câmera desativada pelo console.':'Configure a câmera no console.');
  return;
 }
 frame.hidden=false;
 frame.src=sourceUrl(id,s.audio===true);
 say('Fonte de câmera iniciada. Aguardando vídeo do celular pelo VDO.Ninja…');
}
frame.addEventListener('load',()=>{
 if(!frame.hidden)say('Conectado ao visualizador VDO.Ninja. A imagem aparece quando o celular começar a transmitir.');
});
async function poll(){
 if(polling)return;
 polling=true;
 try{
  const response=await fetch('/api/camera',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  apply(await response.json());
 }catch(err){say('Falha ao consultar a câmera: '+err.message);}
 finally{polling=false;}
}
poll();
setInterval(poll,1500);
