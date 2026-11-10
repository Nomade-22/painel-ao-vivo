// Indicadores disponíveis na própria sala Shopee Live. Nunca soma eventos de chat:
// notificações repetidas ou re-renderizadas não representam novos espectadores/vendas.
(()=>{
 if(window.__v2jShopeeLiveMonitor)return;
 window.__v2jShopeeLiveMonitor=true;
 const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
 const patterns={
  ccu:[/^espectadores(?: atuais)?$/i,/^assistindo agora$/i,/^usuários online$/i,/^(?:current viewers|viewers online|watching now|ccu)$/i],
  comentarios:[/^comentários(?: totais)?$/i,/^(?:comments|chat messages|comment count)$/i],
  visualizacoes:[/^visualizações(?: totais)?$/i,/^(?:views|total views|view count|watch pv)$/i],
  pedidos:[/^pedidos(?: realizados)?$/i,/^(?:orders|total orders|order count)$/i],
  vendas:[/^vendas\s*(?:\(r\$\))?$/i,/^(?:sales|gmv|revenue)$/i],
  atc:[/^(?:atc|adiciones ao carrinho|adições ao carrinho|add to cart|cart adds)$/i],
  ctr:[/^ctr$/i]
 };
 const valid=/^(?:R\$\s*)?\d[\d.,]*\s*%?$/;
 let last='',sending=false,lastSent=0;
 const pending=new Map(), delivered=new Set();
 window.addEventListener('message', event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.source!=='V2J_SHOPEE_CHAT_OBSERVER'||event.data?.type!=='COMMENTS')return;
  for(const item of (Array.isArray(event.data.eventos)?event.data.eventos:[]).slice(0,30)){
   if(typeof item.id!=='string'||!/^shopee-\d{1,12}$/.test(item.id)||delivered.has(item.id))continue;
   if(typeof item.autor!=='string'||!item.autor.trim()||item.autor.length>80||typeof item.texto!=='string'||!item.texto.trim()||item.texto.length>400)continue;
   pending.set(item.id,{id:item.id,tipo:'comentario',autor:item.autor,texto:item.texto,hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),recebidoEm:Date.now()});
  }
  if(pending.size>200){const newest=[...pending.entries()].slice(-100);pending.clear();newest.forEach(([key,val])=>pending.set(key,val));}
  scan();
 });
 function collect(){
  const metrics={};
  const leaves=[...document.querySelectorAll('span,div,p,strong,small,label')]
   .filter(el=>el.children.length===0&&el.getClientRects().length&&normalize(el.textContent).length<55);
  for(const [field,labels] of Object.entries(patterns)){
   for(const leaf of leaves){
    if(!labels.some(rx=>rx.test(normalize(leaf.textContent))))continue;
    const label=normalize(leaf.textContent);
    for(let parent=leaf.parentElement,depth=0;parent&&depth<3;parent=parent.parentElement,depth++){
     const parts=(parent.innerText||'').split(/\n/).map(normalize).filter(Boolean);
     const index=parts.indexOf(label);
     if(index<0)continue;
     const candidate=parts[index+1];
     if(candidate&&valid.test(candidate)){metrics[field]=candidate;break;}
    }
    if(metrics[field]!==undefined)break;
   }
  }
  return metrics;
 }
 async function scan(force=false){
  if(sending)return {ok:false,message:'Leitura em andamento'};
  const metrics=collect();
  const serialized=JSON.stringify(metrics);
  if(!force&&pending.size===0&&serialized===last&&Date.now()-lastSent<30000)return {ok:true,found:Object.keys(metrics).length,cached:true};
  sending=true;
  try{
   const eventos=[...pending.values()].slice(0,30);
   const response=await chrome.runtime.sendMessage({type:'V2J_SHOPEE_LIVE_METRICS',metricas:metrics,eventos});
   if(response?.ok){
    last=serialized;lastSent=Date.now();
    for(const item of eventos){delivered.add(item.id);pending.delete(item.id);}
    if(delivered.size>1000){const recent=[...delivered].slice(-600);delivered.clear();recent.forEach(id=>delivered.add(id));}
   }
   return {ok:!!response?.ok,found:Object.keys(metrics).length,mensagensEnviadas:response?.ok?eventos.length:0,error:response?.error};
  }catch(e){return {ok:false,error:String(e.message||e)};}finally{sending=false;}
 }
 chrome.runtime.onMessage.addListener((message,_sender,respond)=>{
  if(message?.type!=='V2J_SHOPEE_FORCE_SCAN')return;
  scan(true).then(respond);return true;
 });
 setTimeout(scan,1500);
 setInterval(scan,10000);
})();
