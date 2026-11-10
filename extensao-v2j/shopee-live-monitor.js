// Indicadores disponíveis na própria sala Shopee Live. Nunca soma eventos de chat:
// notificações repetidas ou re-renderizadas não representam novos espectadores/vendas.
(()=>{
 if(window.__v2jShopeeLiveMonitor)return;
 window.__v2jShopeeLiveMonitor=true;
 const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
 const patterns={
  ccu:[/^espectadores(?: atuais)?$/i,/^assistindo agora$/i,/^usuários online$/i],
  comentarios:[/^comentários(?: totais)?$/i],
  visualizacoes:[/^visualizações(?: totais)?$/i],
  pedidos:[/^pedidos(?: realizados)?$/i],
  vendas:[/^vendas\s*(?:\(r\$\))?$/i]
 };
 const valid=/^(?:R\$\s*)?\d[\d.,]*$/;
 let last='',sending=false,lastSent=0;
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
  if(!force&&serialized===last&&Date.now()-lastSent<30000)return {ok:true,found:Object.keys(metrics).length,cached:true};
  sending=true;
  try{
   const response=await chrome.runtime.sendMessage({type:'V2J_SHOPEE_LIVE_METRICS',metricas:metrics});
   if(response?.ok){last=serialized;lastSent=Date.now();}
   return {ok:!!response?.ok,found:Object.keys(metrics).length,error:response?.error};
  }catch(e){return {ok:false,error:String(e.message||e)};}finally{sending=false;}
 }
 chrome.runtime.onMessage.addListener((message,_sender,respond)=>{
  if(message?.type!=='V2J_SHOPEE_FORCE_SCAN')return;
  scan(true).then(respond);return true;
 });
 setTimeout(scan,1500);
 setInterval(scan,10000);
})();
