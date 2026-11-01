// Transmissor de câmera do celular por WebRTC. O acesso começa APENAS após tocar em Iniciar.
(()=>{
 const $=id=>document.getElementById(id);
 const startBtn=$('cameraStartLocal'),stopBtn=$('cameraStopLocal'),flipBtn=$('cameraFlip');
 const video=$('cameraPreview'),info=$('cameraSenderStatus'),audioCheck=$('cameraAudio');
 if(!startBtn||!stopBtn||!video||!info)return;
 const pcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]};
 const valid=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(v);
 let stream=null,peer=null,channel='',session='',heartbeat=null,answers=null,watcher=null;
 let starting=false,active=false,canceled=false,face='environment',generation=0;
 const message=text=>{info.textContent=text;};
 const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
 const fromURL=new URLSearchParams(location.search).get('channel')||'';
 const currentChannel=()=>{
  if(fromURL)return valid(fromURL)?fromURL:'';
  const url=$('cameraPublishUrl')?.value||'';
  try{const x=new URL(url);return x.origin===location.origin?(x.searchParams.get('channel')||''):'';}catch{return '';}
 };
 const controls=()=>{
  startBtn.disabled=starting||active;
  stopBtn.disabled=!starting&&!active;
  if(flipBtn)flipBtn.disabled=!active&&!starting;
  if(audioCheck)audioCheck.disabled=active||starting;
 };
 const stopMedia=()=>{
  if(peer){peer.close();peer=null;}
  if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
  video.pause();video.srcObject=null;
  clearInterval(heartbeat);clearInterval(answers);clearInterval(watcher);
  heartbeat=null;answers=null;watcher=null;
 };
 async function apiSignal(action,description){
  const res=await fetch('/api/camera-signal',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({channel,session,action,description})
  });
  if(!res.ok){
   const body=await res.json().catch(()=>({}));
   throw Error(body.erro||'HTTP '+res.status);
  }
 }
 async function apiState(body){
  const res=await fetch('/api/camera',{
   method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  if(!res.ok){
   const data=await res.json().catch(()=>({}));
   throw Error(data.erro||'HTTP '+res.status);
  }
  return res.json();
 }
 async function iceComplete(conn){
  if(conn.iceGatheringState==='complete')return;
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{cleanup();reject(Error('Tempo esgotado para reunir a conexão WebRTC.'));},15000);
   const changed=()=>{if(conn.iceGatheringState==='complete'){cleanup();resolve();}};
   const cleanup=()=>{clearTimeout(timeout);conn.removeEventListener('icegatheringstatechange',changed);};
   conn.addEventListener('icegatheringstatechange',changed);
   changed();
  });
 }
 async function getCamera(needAudio){
  const opts={video:{facingMode:{ideal:face},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}},
   audio:needAudio?{echoCancellation:true,noiseSuppression:true,autoGainControl:true}:false};
  try{return await navigator.mediaDevices.getUserMedia(opts);}
  catch(e){
   if(e.name==='OverconstrainedError')return navigator.mediaDevices.getUserMedia({video:true,audio:opts.audio});
   throw e;
  }
 }
 async function start(){
  if(active||starting)return;
  const id=currentChannel();
  if(!valid(id)){message('Gere o link da câmera na aba Câmera e abra-o neste celular.');return;}
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
   message('A câmera precisa de um navegador compatível e HTTPS. Abra o link pelo Chrome ou Safari atualizado.');
   return;
  }
  channel=id;starting=true;canceled=false;generation+=1;
  const currentGeneration=generation;
  controls();
  message('Solicitando autorização da câmera deste aparelho…');
  try{
   // Chamado diretamente pelo clique para que o navegador solicite permissão.
   const local=await getCamera(!!audioCheck?.checked);
   if(canceled||currentGeneration!==generation){local.getTracks().forEach(t=>t.stop());return;}
   stream=local;
   video.srcObject=local;video.muted=true;video.playsInline=true;
   video.play().catch(()=>{});
   session=hex(16);
   message('Câmera autorizada ✓ Preparando a transmissão para o OBS…');
   // Evita transmitir por um link antigo que foi renovado depois.
   const configRes=await fetch('/api/camera',{cache:'no-store'});
   if(!configRes.ok)throw Error('Não foi possível conferir o link da câmera');
   const camState=await configRes.json();
   if(camState.cameraId!==channel)throw Error('Este link expirou. Gere e abra o novo link da câmera.');
   await apiState({enabled:true,audio:!!audioCheck?.checked});
   const pc=new RTCPeerConnection(pcConfig);
   peer=pc;
   for(const track of local.getTracks())pc.addTrack(track,local);
   pc.onconnectionstatechange=()=>{
    if(peer!==pc)return;
    const connection=pc.connectionState;
    if(connection==='connected')message('✅ Câmera conectada ao OBS! Imagem sendo enviada.');
    if(connection==='disconnected')message('⚠️ Conexão instável. Confira o 4G/5G e o OBS.');
    if(connection==='failed')message('❌ A rede bloqueou a conexão WebRTC. Teste outra rede ou use uma solução com servidor TURN.');
   };
   await pc.setLocalDescription(await pc.createOffer());
   await iceComplete(pc);
   if(canceled||currentGeneration!==generation)return;
   await apiSignal('offer',pc.localDescription);
   active=true;starting=false;controls();
   message('Câmera ativada ✓ Aguardando resposta do reprodutor do OBS…');
   const startTime=Date.now();
   let checking=false;
   answers=setInterval(async()=>{
    if(!active||peer!==pc||pc.remoteDescription||checking)return;
    checking=true;
    try{
     const res=await fetch('/api/camera-signal?channel='+encodeURIComponent(channel)+'&side=sender',{cache:'no-store'});
     if(!res.ok)throw Error('HTTP '+res.status);
     const {answer}=await res.json();
     if(answer?.session===session){
      clearInterval(answers);answers=null;
      await pc.setRemoteDescription(answer.description);
      message('Conectando a imagem ao OBS…');
     }else if(Date.now()-startTime>90000){
      clearInterval(answers);answers=null;
      message('⚠️ Nenhuma resposta do OBS. Confirme que a fonte Câmera está aberta e atualizada.');
     }
    }catch(err){message('Falha ao negociar a conexão: '+err.message);}
    finally{checking=false;}
   },1200);
   heartbeat=setInterval(()=>{
    if(peer===pc&&active&&pc.localDescription)apiSignal('heartbeat',pc.localDescription).catch(()=>message('⚠️ Sinalização temporariamente indisponível.'));
   },55000);
   watcher=setInterval(async()=>{
    if(!active)return;
    try{
     const r=await fetch('/api/camera',{cache:'no-store'});
     if(!r.ok)return;
     const data=await r.json();
     if(data.cameraId!==channel||!data.enabled){
      stop(false);
      message('Câmera desativada pelo console.');
     }
    }catch{}
   },6000);
  }catch(err){
   stopMedia();active=false;starting=false;controls();
   const msg=err.name==='NotAllowedError'?'Permissão negada. Libere a câmera nas configurações do navegador.':
      err.name==='NotFoundError'?'Nenhuma câmera disponível neste aparelho.':
      err.name==='NotReadableError'?'A câmera está sendo usada por outro aplicativo.':err.message;
   message('Não foi possível iniciar: '+msg);
  }
 }
 function stop(updateState=true){
  canceled=true;generation+=1;
  const oldSession=session,oldChannel=channel;
  starting=false;active=false;
  stopMedia();session='';controls();
  if(oldSession&&oldChannel){
   fetch('/api/camera-signal',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({channel:oldChannel,session:oldSession,action:'stop'}),keepalive:true
   }).catch(()=>{});
  }
  if(updateState&&oldChannel)apiState({enabled:false}).catch(()=>{});
  message('Câmera desligada. Nenhuma imagem está sendo enviada.');
 }
 startBtn.addEventListener('click',start);
 stopBtn.addEventListener('click',()=>stop(true));
 if(flipBtn)flipBtn.addEventListener('click',()=>{
  if(!active)return;
  face=face==='environment'?'user':'environment';
  stop(false);
  start();
 });
 window.addEventListener('pagehide',()=>{
  if(session&&channel)navigator.sendBeacon?.('/api/camera-signal',new Blob([
   JSON.stringify({channel,session,action:'stop'})
  ],{type:'application/json'}));
  stopMedia();
 });
 controls();
 if(fromURL&&!valid(fromURL))message('Link inválido. Gere um link novo no console.');
})();
