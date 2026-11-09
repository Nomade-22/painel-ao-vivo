const TARGET='https://painel-ao-vivo-jhonatan23.vercel.app/api/retorno?sync=1';
chrome.action.onClicked.addListener(async tab=>{
 if(!tab?.id||!tab.url?.startsWith('https://shop.tiktok.com/streamer/live/'))return;
 chrome.tabs.sendMessage(tab.id,{type:'V2J_TOGGLE'}).catch(()=>{});
});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type!=='V2J_SYNC'||!sender.tab?.url?.startsWith('https://shop.tiktok.com/streamer/live/'))return;
 fetch(TARGET,{method:'PUT',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:msg.items})})
 .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.erro||'HTTP '+r.status);respond({ok:true,...data});})
 .catch(e=>respond({ok:false,error:e.message}));
 return true;
});

chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type!=='V2J_CAPTURE'||!sender.tab?.url?.startsWith('https://shop.tiktok.com/view/product/'))return;
 fetch('https://painel-ao-vivo-jhonatan23.vercel.app/api/retorno?capture=1',{
  method:'PUT',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(msg.product)
 }).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.erro||'HTTP '+r.status);respond({ok:true});})
 .catch(e=>respond({ok:false,error:e.message}));
 return true;
});

const BATCH_ENDPOINT='https://painel-ao-vivo-jhonatan23.vercel.app/api/retorno?central=1';
const BATCH_ALARM='v2j-importacao-proxima-etapa';
const CHUNK_SIZE=3;
let processing=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function getBatch(){return (await chrome.storage.local.get('v2jBatch')).v2jBatch||{};}
async function setBatch(patch){
 const previous=await getBatch();
 const next={...previous,...patch};
 await chrome.storage.local.set({v2jBatch:next});
 return next;
}
async function fetchCatalog(){
 const response=await fetch(BATCH_ENDPOINT,{credentials:'omit',cache:'no-store'});
 if(!response.ok)throw Error('Catálogo indisponível (HTTP '+response.status+')');
 return response.json();
}
async function processNextChunk(){
 if(processing)return;
 processing=true;
 try{
  let job=await getBatch();
  if(!job.running)return;
  const end=Math.min(job.cursor+CHUNK_SIZE,job.total);
  for(let i=job.cursor;i<end;i++){
   job=await getBatch();
   if(!job.running)break;
   const item=job.queue[i];
   let tab=null;
   try{
    await setBatch({message:'Lendo item #'+item.numero+' ('+(i+1)+' de '+job.total+')…'});
    const url=new URL(item.link);
    url.searchParams.set('v2j_batch','1');
    const openedAt=Date.now();
    tab=await chrome.tabs.create({url:url.href,active:false});
    await pause(12000);
    const data=await fetchCatalog();
    const captured=data.fichaCapturada;
    const saved=data.catalogo?.find(p=>p.numero===item.numero);
    const confirmed=captured?.id===item.id&&Number(captured.capturadoEm)>=openedAt&&saved?.descricao?.length>=55;
    await setBatch({cursor:i+1,done:i+1,success:job.success+(confirmed?1:0),
      failed:job.failed+(confirmed?0:1),
      message:'Item #'+item.numero+': '+(confirmed?'descrição atualizada':'não foi possível confirmar a captura')});
   }catch(e){
    await setBatch({cursor:i+1,done:i+1,failed:job.failed+1,message:'Item #'+item.numero+': '+e.message});
   }finally{
    if(tab?.id)try{await chrome.tabs.remove(tab.id)}catch(e){}
   }
   await pause(1100);
  }
  job=await getBatch();
  if(!job.running)return;
  if(job.cursor>=job.total){
   await chrome.alarms.clear(BATCH_ALARM);
   await setBatch({running:false,queue:[],message:'Concluído: '+job.success+' descrições de '+job.total+' itens. '+job.failed+' sem confirmação.'});
  }else{
   await setBatch({message:'Pausa breve; continuando automaticamente ('+job.done+'/'+job.total+')…'});
   await chrome.alarms.create(BATCH_ALARM,{delayInMinutes:0.5});
  }
 }catch(e){
  await setBatch({running:false,message:'Importação interrompida por erro: '+e.message});
  await chrome.alarms.clear(BATCH_ALARM);
 }finally{processing=false;}
}
async function startBatch(refreshExisting){
 const existing=await getBatch();
 if(existing.running)return {ok:false,message:'Importação já está em andamento.'};
 await chrome.alarms.clear(BATCH_ALARM);
 const data=await fetchCatalog();
 const items=(Array.isArray(data.catalogo)?data.catalogo:[])
  .filter(p=>p.link?.includes('/view/product/')&&(refreshExisting||!p.descricao))
  .sort((a,b)=>a.numero-b.numero)
  .map(p=>({numero:p.numero,link:p.link,id:p.link.match(/\/view\/product\/(\d+)/)?.[1]||''}))
  .filter(p=>p.id);
 if(!items.length)return {ok:false,message:'Nenhum item pendente encontrado.'};
 await chrome.storage.local.set({v2jBatch:{running:true,queue:items,cursor:0,total:items.length,done:0,success:0,failed:0,
  refreshExisting:!!refreshExisting,message:'Iniciando '+items.length+' itens em sequência…'}});
 processNextChunk();
 return {ok:true,total:items.length};
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===BATCH_ALARM)processNextChunk();});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type==='V2J_BATCH_START'){
  startBatch(!!msg.refreshExisting).then(respond).catch(e=>respond({ok:false,message:e.message}));return true;
 }
 if(msg?.type==='V2J_BATCH_STOP'){
  chrome.alarms.clear(BATCH_ALARM).then(()=>setBatch({running:false,queue:[],message:'Importação pausada pelo usuário.'})).then(()=>respond({ok:true}));
  return true;
 }
 if(msg?.type==='V2J_BATCH_STATUS'){getBatch().then(respond);return true;}
});
// Recupera importações em curso após uma suspensão do service worker.
chrome.runtime.onStartup.addListener(async()=>{
 const job=await getBatch();
 if(job.running)await chrome.alarms.create(BATCH_ALARM,{delayInMinutes:0.5});
});

chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type!=='V2J_LIVE'||!sender.tab?.url?.startsWith('https://shop.tiktok.com/streamer/live/'))return;
 fetch('https://painel-ao-vivo-jhonatan23.vercel.app/api/retorno?live=1',{
  method:'PUT',credentials:'omit',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({metricas:msg.metricas,eventos:msg.eventos})
 }).then(async response=>{
  const data=await response.json();
  if(!response.ok)throw Error(data.erro||'HTTP '+response.status);
  respond({ok:true,...data});
 }).catch(e=>respond({ok:false,error:e.message}));
 return true;
});

// Solicitação originada exclusivamente do botão no console V2J autenticado no navegador.
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type!=='V2J_START_LIVE_REQUEST')return;
 if(!msg.fromPopup&&!sender.tab?.url?.startsWith('https://painel-ao-vivo-jhonatan23.vercel.app/console.html')){
  respond({ok:false,message:'Solicitação fora do console V2J.'});return;
 }
 if(msg.fromPopup && sender.id!==chrome.runtime.id){respond({ok:false,message:'Origem da solicitação inválida.'});return;}
 chrome.tabs.query({url:'https://shop.tiktok.com/streamer/live/*'}).then(async tabs=>{
  if(!tabs.length){respond({ok:false,message:'Abra o Gerenciador de LIVE do TikTok Shop no Chrome.'});return;}
  const tab=tabs.find(t=>t.active)||tabs[0];
  try{respond(await chrome.tabs.sendMessage(tab.id,{type:'V2J_CLICK_START_LIVE'}));}
  catch{respond({ok:false,message:'Recarregue a aba do TikTok para ativar a extensão e tente novamente.'});}
 }).catch(()=>respond({ok:false,message:'Não foi possível localizar a aba do TikTok.'}));
 return true;
});
