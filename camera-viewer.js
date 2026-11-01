// Reprodutor OBS da câmera: recebe WebRTC do celular sem modificar video-obs.html.
const player=document.getElementById('cameraRemoteVideo');
const status=document.getElementById('cameraViewerStatus');
const config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]};
let channel='',session='',peer=null,enabled=false,processing=false,checking=false;
let audioEnabled=false,lastSuccess=0;
function say(msg){
 if(status)status.textContent=msg;
 console.info('[Câmera OBS]',msg);
}
function displayVideo(show){
 player.style.visibility=show?'visible':'hidden';
}
function reset(){
 if(peer)peer.close();
 peer=null;session='';
 player.pause();player.srcObject=null;
 displayVideo(false);
}
async function getCamera(){
 const response=await fetch('/api/camera',{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
async function getOffer(){
 const response=await fetch('/api/camera-signal?channel='+encodeURIComponent(channel)+'&side=receiver',{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
async function post(body){
 const response=await fetch('/api/camera-signal',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({channel,...body})
 });
 if(!response.ok){
  const payload=await response.json().catch(()=>({}));
  throw Error(payload.erro||'HTTP '+response.status);
 }
}
async function iceComplete(pc){
 if(pc.iceGatheringState==='complete')return;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{clear();reject(Error('A rede não conseguiu negociar ICE.'));},15000);
  const onChange=()=>{if(pc.iceGatheringState==='complete'){clear();resolve();}};
  const clear=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',onChange);};
  pc.addEventListener('icegatheringstatechange',onChange);
  onChange();
 });
}
async function accept(offer){
 reset();
 session=offer.session;
 const negotiated=offer.session;
 const pc=new RTCPeerConnection(config);
 peer=pc;
 pc.ontrack=event=>{
  if(peer!==pc)return;
  const media=event.streams?.[0]||new MediaStream([event.track]);
  if(player.srcObject!==media)player.srcObject=media;
  player.muted=!audioEnabled;
  player.playsInline=true;
  player.autoplay=true;
  const showOnPlay=()=>{if(peer===pc){displayVideo(true);say('✅ Imagem da câmera recebida!');}};
  player.onplaying=showOnPlay;
  player.play().then(showOnPlay).catch(e=>{
   say('O navegador bloqueou a reprodução: '+e.message+'. Verifique a fonte Navegador no OBS.');
  });
 };
 pc.onconnectionstatechange=()=>{
  if(peer!==pc)return;
  if(pc.connectionState==='connected'){lastSuccess=Date.now();say('✅ Câmera conectada ao celular.');}
  if(pc.connectionState==='disconnected')say('⚠️ Câmera desconectada. Verifique a internet do celular.');
  if(pc.connectionState==='failed'){say('❌ WebRTC bloqueado ou conexão perdida. Desligue e inicie novamente pelo celular.');reset();}
 };
 await pc.setRemoteDescription(offer.description);
 await pc.setLocalDescription(await pc.createAnswer());
 await iceComplete(pc);
 if(peer!==pc||session!==negotiated)return;
 await post({action:'answer',session:negotiated,description:pc.localDescription});
 say('Resposta enviada. Aguardando a imagem do celular…');
}
async function checkOffer(){
 if(!enabled||!channel||checking)return;
 checking=true;
 try{
  const {offer}=await getOffer();
  if(offer?.session){
   if(offer.session!==session)await accept(offer);
  }else if(session){
   reset();say('Celular desconectado. Aguardando transmissão…');
  }
 }catch(e){say('Falha de sinalização: '+e.message);}
 finally{checking=false;}
}
async function checkState(){
 if(processing)return;
 processing=true;
 try{
  const data=await getCamera();
  const id=typeof data.cameraId==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(data.cameraId)?data.cameraId:'';
  const shouldBeEnabled=!!data.enabled&&!!id;
  if(!shouldBeEnabled){
   if(enabled||peer){reset();}
   channel=id;enabled=false;
   say(id?'Câmera desligada. Aguardando comando do celular…':'Configure a câmera na aba Câmera do console.');
  }else{
   if(id!==channel){reset();session='';}
   channel=id;enabled=true;audioEnabled=data.audio===true;
   player.muted=!audioEnabled;
   if(!peer)await checkOffer();
  }
 }catch(e){say('Falha ao consultar a câmera: '+e.message);}
 finally{processing=false;}
}
checkState();
setInterval(checkState,3200);
setInterval(checkOffer,1500);
window.addEventListener('pagehide',reset);
