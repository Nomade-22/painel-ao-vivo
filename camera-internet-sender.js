// Emissor remoto: VDO.Ninja oferece rota TURN para casa -> escritório.
(()=>{
 const $=id=>document.getElementById(id);
 const frame=$('internetPublisher'),startBtn=$('startInternet'),stopBtn=$('stopInternet');
 const refreshBtn=$('refreshInternet'),directBtn=$('directInternet'),info=$('internetStatus');
 if(!frame||!startBtn||!stopBtn||!info)return;
 const id=new URLSearchParams(location.search).get('channel')||'';
 const valid=/^[A-Za-z0-9_-]{16,64}$/.test(id);
 const presetSelect=$('videoPreset'),transportSelect=$('connectionMode');
 const profiles={
  economy:{width:640,height:360,fps:18,bitrate:550},
  balanced:{width:960,height:540,fps:24,bitrate:1000},
  quality:{width:1280,height:720,fps:24,bitrate:1800}
 };
 let selected={preset:'balanced',transport:'auto'};
 const prefsKey='camera-performance-prefs-v1';
 try{
  const saved=JSON.parse(localStorage.getItem(prefsKey)||'{}');
  if(profiles[saved.preset])presetSelect.value=saved.preset;
  if(['auto','relay'].includes(saved.transport))transportSelect.value=saved.transport;
 }catch{}
 const snapshot=()=>({
  preset:profiles[presetSelect.value]?presetSelect.value:'balanced',
  transport:transportSelect.value==='relay'?'relay':'auto'
 });
 const remember=()=>{
  selected=snapshot();
  try{localStorage.setItem(prefsKey,JSON.stringify(selected));}catch{}
 };
 presetSelect.addEventListener('change',remember);
 transportSelect.addEventListener('change',remember);
 remember();
 let running=false,starting=false,closing=false;
 const say=message=>{info.textContent=message;};
 const pushUrl=()=>{
  const q=profiles[selected.preset];
  const params=new URLSearchParams({
   push:id,width:String(q.width),height:String(q.height),
   fps:String(q.fps),outboundvideobitrate:String(q.bitrate),
   maxvideobitrate:String(q.bitrate)
  });
  return 'https://vdo.ninja/?'+params.toString()+'&webcam'+(selected.transport==='relay'?'&relay':'');
 };
 function controls(){
  startBtn.disabled=!valid||starting||running;
  stopBtn.disabled=!running&&!starting;
  presetSelect.disabled=starting||running;
  transportSelect.disabled=starting||running;
  refreshBtn.disabled=!running;
  if(directBtn)directBtn.disabled=!valid;
 }
 async function remote(body){
  const response=await fetch('/api/camera',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.erro||('Erro HTTP '+response.status));
  return data;
 }
 async function start(){
  if(running||starting)return;
  if(!valid){say('Link de câmera inválido. Gere um novo link na aba Câmera do console.');return;}
  remember();
  starting=true;closing=false;controls();
  say('Preparando vídeo '+selected.preset+' pela conexão '+(selected.transport==='auto'?'automática…':'com retransmissão…'));

  try{
   const result=await fetch('/api/camera',{cache:'no-store'});
   if(!result.ok)throw Error('Não foi possível consultar o canal da câmera.');
   const configured=await result.json();
   if(configured.cameraId!==id)throw Error('O link da câmera foi renovado. Abra o link mais recente do console.');
   await remote({enabled:true,preset:selected.preset,transport:selected.transport});
   if(closing)return;
   frame.src=pushUrl();
   frame.hidden=false;
   running=true;
   say('Configuração enviada: '+selected.preset+' / '+(selected.transport==='auto'?'rota automática':'servidor intermediário')+'. Na janela abaixo permita a câmera e toque em Start/Iniciar.');
  }catch(e){say('Não foi possível começar: '+e.message);}
  finally{starting=false;controls();}
 }
 async function stop(){
  closing=true;running=false;starting=false;
  frame.hidden=true;frame.removeAttribute('src');controls();
  say('Câmera desligada. O reprodutor OBS fica transparente.');
  try{await remote({enabled:false});}catch(e){say('Câmera encerrada neste aparelho. Falha ao avisar o console: '+e.message);}
 }
 startBtn.onclick=start;
 stopBtn.onclick=stop;
 refreshBtn.onclick=()=>{
  if(!running)return;
  frame.src='about:blank';
  setTimeout(()=>{if(running)frame.src=pushUrl();},200);
  say('Reconectando… confirme a permissão e toque em Start/Iniciar.');
 };
 directBtn.onclick=async()=>{
  if(!valid)return;
  if(running||starting){
   say('Para usar o modo direto, desligue primeiro a transmissão incorporada; não abra duas câmeras com o mesmo ID.');
   return;
  }
  remember();
  // Reserva a aba no clique; evita bloqueio de pop-up após a requisição assíncrona.
  const tab=window.open('about:blank','_blank');
  if(!tab){say('O navegador bloqueou a nova aba. Habilite pop-ups ou use o botão Ligar câmera.');return;}
  try{
   const config=await fetch('/api/camera',{cache:'no-store'});
   if(!config.ok)throw Error('Não foi possível verificar a câmera.');
   const current=await config.json();
   if(current.cameraId!==id)throw Error('O link mudou. Abra o link atualizado pelo console.');
   await remote({enabled:true,preset:selected.preset,transport:selected.transport});
   tab.location.replace(pushUrl());
   say('Modo direto aberto no VDO.Ninja; permita a câmera e toque em Start/Iniciar. Use apenas uma aba transmissora.');
  }catch(e){tab.close();say('Falha ao abrir modo direto: '+e.message);}
 };
 controls();
 if(!valid)say('Link inválido ou ausente. Gere o link no console.');
})();
