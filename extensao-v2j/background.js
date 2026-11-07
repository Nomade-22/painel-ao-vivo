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

let batchRunning=false,batchStop=false;
const BATCH_ENDPOINT='https://painel-ao-vivo-jhonatan23.vercel.app/api/retorno?central=1';
async function reportBatch(patch){
 const previous=(await chrome.storage.local.get('v2jBatch')).v2jBatch||{};
 await chrome.storage.local.set({v2jBatch:{...previous,...patch}});
}
async function importBatch(){
 if(batchRunning)return;
 batchRunning=true;batchStop=false;
 try{
  await reportBatch({running:true,done:0,total:0,success:0,message:'Buscando catálogo da Central V2J…'});
  const response=await fetch(BATCH_ENDPOINT,{credentials:'omit',cache:'no-store'});
  if(!response.ok)throw Error('Não foi possível carregar o catálogo (HTTP '+response.status+')');
  const data=await response.json();
  const items=(Array.isArray(data.catalogo)?data.catalogo:[])
   .filter(p=>p.link?.includes('/view/product/')&&!p.descricao)
   .sort((a,b)=>a.numero-b.numero).slice(0,5);
  if(!items.length)throw Error('Nenhum item sem descrição encontrado com link de produto.');
  await reportBatch({total:items.length,message:'Iniciando importação de '+items.length+' produtos…'});
  let success=0,done=0;
  for(const item of items){
   if(batchStop)break;
   let tab=null;
   try{
    await reportBatch({message:'Abrindo item #'+item.numero+'…'});
    const url=new URL(item.link);url.searchParams.set('v2j_batch','1');
    tab=await chrome.tabs.create({url:url.href,active:false});
    // A página precisa carregar a seção de descrição; a extensão rola a aba criada.
    await new Promise(resolve=>setTimeout(resolve,14000));
    const updated=await fetch(BATCH_ENDPOINT,{cache:'no-store'}).then(r=>r.json());
    const saved=updated.catalogo?.find(p=>p.numero===item.numero);
    if(saved?.descricao?.length>60)success++;
    done++;
    await reportBatch({done,success,message:'Item #'+item.numero+': '+(saved?.descricao?.length>60?'descrição recebida':'sem descrição capturada')});
   }catch(e){done++;await reportBatch({done,success,message:'Item #'+item.numero+': '+e.message});}
   finally{if(tab?.id)try{await chrome.tabs.remove(tab.id)}catch(e){}}
   if(!batchStop)await new Promise(resolve=>setTimeout(resolve,2000));
  }
  await reportBatch({running:false,done,success,message:batchStop?'Importação interrompida.':'Teste concluído: '+success+' descrições em '+done+' itens.'});
 }catch(e){await reportBatch({running:false,message:'Falha: '+e.message});}
 finally{batchRunning=false;batchStop=false;}
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.type==='V2J_BATCH_START'){if(batchRunning){respond({ok:false,message:'Importação já em andamento'});return;}importBatch();respond({ok:true});}
 if(msg?.type==='V2J_BATCH_STOP'){batchStop=true;respond({ok:true});}
 if(msg?.type==='V2J_BATCH_STATUS'){chrome.storage.local.get('v2jBatch').then(x=>respond(x.v2jBatch||{running:false,message:'Nenhuma importação iniciada.'}));return true;}
});
