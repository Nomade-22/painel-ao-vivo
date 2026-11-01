// Controle de câmera remota, completamente independente dos vídeos gravados.
const $=id=>document.getElementById(id);
const state={cameraId:'',enabled:false,audio:false};
let requests=Promise.resolve();
const status=message=>{$('cameraStatus').textContent=message;};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(id);
const senderUrl=()=>validId(state.cameraId)?'https://vdo.ninja/?push='+encodeURIComponent(state.cameraId)+'&webcam':'';
const obsUrl=new URL('/camera-obs.html',window.location.origin).href;
$('cameraObsUrl').value=obsUrl;
function showState(data){
 state.cameraId=validId(data.cameraId)?data.cameraId:'';
 state.enabled=!!data.enabled;
 state.audio=!!data.audio;
 $('cameraPublishUrl').value=senderUrl();
 $('cameraAudio').checked=state.audio;
 $('cameraLinkStatus').textContent=state.cameraId?'Link configurado':'Não configurada';
 $('cameraLiveStatus').textContent=state.enabled?'📹 Ativada (aguardando celular)':'Desligada';
 $('cameraEnable').disabled=!state.cameraId||state.enabled;
 $('cameraDisable').disabled=!state.enabled;
 $('cameraCopy').disabled=!state.cameraId;
 $('cameraWhatsapp').disabled=!state.cameraId;
}
async function load(){
 try{
  const r=await fetch('/api/camera',{cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.erro||'HTTP '+r.status);
  showState(data);
 }catch(e){status('Não foi possível carregar a câmera: '+e.message);}
}
function send(patch,message){
 requests=requests.catch(()=>{}).then(async()=>{
  const r=await fetch('/api/camera',{
   method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.erro||'HTTP '+r.status);
  showState(data);
  if(message)status(message);
 }).catch(e=>{status('Falha ao controlar a câmera: '+e.message);throw e;});
 return requests;
}
function makeId(){
 const bytes=new Uint8Array(24);
 if(!window.crypto?.getRandomValues)throw Error('Este navegador não consegue criar o link com segurança.');
 window.crypto.getRandomValues(bytes);
 return 'cam'+Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
}
$('cameraGenerate').onclick=async()=>{
 try{
  const cameraId=makeId();
  await send({cameraId,enabled:false,audio:state.audio},'Novo link gerado. Abra no celular para enviar a câmera. O link anterior deixa de funcionar neste reprodutor.');
 }catch(e){status(e.message);}
};
async function copyText(text,field,msg){
 try{await navigator.clipboard.writeText(text);status(msg);}
 catch{
  field.focus();field.select();
  status('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.');
 }
}
$('cameraCopy').onclick=()=>{
 const url=senderUrl();
 if(!url){status('Gere o link da câmera primeiro.');return;}
 copyText(url,$('cameraPublishUrl'),'Link do celular copiado!');
};
$('cameraObsCopy').onclick=()=>{
 copyText(obsUrl,$('cameraObsUrl'),'Endereço do reprodutor exclusivo da câmera copiado!');
};
$('cameraWhatsapp').onclick=()=>{
 const url=senderUrl();
 if(!url){status('Gere um link primeiro.');return;}
 const body='Link para enviar minha câmera à LIVE:\n'+url+'\n\nAbra pelo celular, autorize a câmera e inicie o envio no VDO.Ninja.';
 window.open('https://wa.me/?text='+encodeURIComponent(body),'_blank','noopener,noreferrer');
};
$('cameraEnable').onclick=()=>{
 if(!validId(state.cameraId)){status('Gere um link da câmera primeiro.');return;}
 send({enabled:true,audio:$('cameraAudio').checked},
  'Fonte da câmera habilitada. Inicie a transmissão no celular; o OBS deve mostrar a imagem na fonte Câmera.');
};
$('cameraDisable').onclick=()=>{
 send({enabled:false},'Câmera desligada no reprodutor exclusivo. Os vídeos seguem sem alteração.');
};
$('cameraAudio').onchange=()=>{
 send({audio:$('cameraAudio').checked},'Configuração de áudio da câmera atualizada.');
};
showState(state);
load();
