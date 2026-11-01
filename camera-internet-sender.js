// Emissor remoto: VDO.Ninja oferece rota TURN para casa -> escritório.
(()=>{
 const $=id=>document.getElementById(id);
 const frame=$('internetPublisher'),startBtn=$('startInternet'),stopBtn=$('stopInternet');
 const refreshBtn=$('refreshInternet'),directBtn=$('directInternet'),info=$('internetStatus');
 if(!frame||!startBtn||!stopBtn||!info)return;
 const id=new URLSearchParams(location.search).get('channel')||'';
 const valid=/^[A-Za-z0-9_-]{16,64}$/.test(id);
 let running=false,starting=false,closing=false;
 const say=message=>{info.textContent=message;};
 const pushUrl=()=> 'https://vdo.ninja/?push='+encodeURIComponent(id)+'&webcam&relay';
 function controls(){
  startBtn.disabled=!valid||starting||running;
  stopBtn.disabled=!running&&!starting;
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
  starting=true;closing=false;controls();
  say('Conectando o celular com o escritório pela internet…');
  try{
   const result=await fetch('/api/camera',{cache:'no-store'});
   if(!result.ok)throw Error('Não foi possível consultar o canal da câmera.');
   const configured=await result.json();
   if(configured.cameraId!==id)throw Error('O link da câmera foi renovado. Abra o link mais recente do console.');
   await remote({enabled:true});
   if(closing)return;
   frame.src=pushUrl();
   frame.hidden=false;
   running=true;
   say('Na janela abaixo, permita a câmera e toque em Start/Iniciar. Mantenha o celular desbloqueado durante a LIVE.');
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
 directBtn.onclick=()=>{
  if(!valid)return;
  window.open(pushUrl(),'_blank','noopener,noreferrer');
  say('Janela direta aberta. Use apenas uma sessão transmissora por vez; desligue a janela incorporada se necessário.');
 };
 controls();
 if(!valid)say('Link inválido ou ausente. Gere o link no console.');
})();
