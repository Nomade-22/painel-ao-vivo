// Reprodutor exclusivo de camera via VDO.Ninja (casa -> escritorio pela Internet).
// URL externa do OBS: /camera-obs.html. Sem elementos ou controles sobre o vídeo.
const frame=document.getElementById('cameraRemoteFrame');
const status=document.getElementById('cameraViewerStatus');
if(new URLSearchParams(location.search).get('debug')==='1')document.body.classList.add('debug');
let lastKey='',polling=false;
function say(message){
 if(status)status.textContent=message;
 console.info('[Camera internet]',message);
}
const profiles={
 economy:{bitrate:550,buffer:170},
 balanced:{bitrate:1000,buffer:180},
 quality:{bitrate:1800,buffer:200}
};
function viewUrl(id,audio,preset,transport){
 const p=profiles[preset]||profiles.balanced;
 const query=new URLSearchParams({
  view:id,videobitrate:String(p.bitrate),buffer:String(p.buffer)
 });
 return 'https://vdo.ninja/?'+query.toString()+'&cleanoutput&transparent'
  +(transport==='relay'?'&relay':'')+(audio?'':'&noaudio');
}
function display(data){
 const id=typeof data.cameraId==='string' && /^[A-Za-z0-9_-]{16,64}$/.test(data.cameraId)?data.cameraId:'';
 const enabled=!!data.enabled&&!!id;
 const preset=profiles[data.preset]?data.preset:'balanced';
 const transport=data.transport==='auto'?'auto':'relay';
 const key=enabled?(id+'-'+Boolean(data.audio)+'-'+preset+'-'+transport):'disabled';
 if(key===lastKey)return;
 lastKey=key;
 if(!enabled){
  frame.hidden=true;
  frame.removeAttribute('src');
  say(id?'Câmera desligada. Aguardando celular…':'Gere o link na aba Câmera do console.');
  return;
 }
 frame.hidden=false;
 // Reprodutor remoto transparente. O site hospedeiro não precisa de permissões de câmera.
 frame.src=viewUrl(id,!!data.audio,preset,transport);
 say('Aguardando celular pela internet ('+(transport==='auto'?'conexão automática':'servidor TURN')+', qualidade '+preset+')…');
}
frame.addEventListener('load',()=>{
 if(!frame.hidden)say('Reprodutor de câmera carregado. Confirme Start/Iniciar no VDO.Ninja do celular. Se não houver vídeo, tente o modo Compatível no envio.');
});
window.addEventListener('message',(event)=>{
 if(event.origin!=='https://vdo.ninja' && event.origin!=='https://www.vdo.ninja')return;
 if(!event.data || typeof event.data!=='object')return;
 const v=event.data;
 if(v.action==='video-added'||v.action==='videoAdded'||v.videoAdded||v.streamID && (v.action==='new-viewer'||v.action==='video-added')){
  say('✅ Sinal de vídeo remoto recebido do celular.');
 }
});
async function poll(){
 if(polling)return;
 polling=true;
 try{
  const response=await fetch('/api/camera',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  display(await response.json());
 }catch(e){say('Falha ao atualizar fonte da câmera: '+e.message);}
 finally{polling=false;}
}
poll();
setInterval(poll,1500);
