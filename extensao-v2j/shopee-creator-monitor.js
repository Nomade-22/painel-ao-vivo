// Leitura somente dos rótulos e valores visíveis no Centro de Criação da Shopee.
// Não consulta endpoints internos nem captura dados de login, chat ou cookies.
(()=>{
 if(window.__v2jShopeeCreatorMonitor)return;
 window.__v2jShopeeCreatorMonitor=true;
 if(!/^\/dashboard\/live(?:\/|$)/.test(location.pathname))return;
 const fields={
  vendas:['Vendas (R$)','Vendas'],usuariosEngajados:['Usuários Engajados'],comentarios:['Comentários'],atc:['ATC'],
  visualizacoes:['Visualizações totais'],tempoMedio:['Tempo de visualização média','Tempo de visualização médio'],
  conversoes:['Total de Conversões'],gpm:['GPM (R$)','GPM'],pedidos:['Pedidos'],ads:['ADS (R$)','ADS'],
  ccu:['CCU'],pcu:['PCU'],ctr:['CTR'],taxaCliquePedidos:['Taxa Cliques/Pedidos'],
  compradores:['Compradores'],itensVendidos:['Itens vendidos']
 };
 const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
 const fold=s=>normalize(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const numeric=/^(?:(?:R\$\s*)?\d[\d.,]*\s*%?|\d{1,2}:\d{2}(?::\d{2})?)$/;
 function read(){
  const metricas={};
  // Apenas elementos cujo texto coincide integralmente com o rótulo conhecido.
  const leaves=[...document.querySelectorAll('span,div,p,small,strong,label,td')]
    .filter(e=>e.children.length===0&&e.getClientRects().length&&normalize(e.textContent).length<80);
  for(const [field,aliases] of Object.entries(fields)){
   for(const label of aliases){
    const leaf=leaves.find(e=>fold(e.textContent)===fold(label));
    if(!leaf)continue;
    let value=null;
    for(let parent=leaf.parentElement,depth=0;parent&&depth<3;parent=parent.parentElement,depth++){
     const parts=(parent.innerText||'').split(/\n/).map(normalize).filter(Boolean);
     const idx=parts.findIndex(p=>fold(p)===fold(label));
     if(idx<0)continue;
     const nearest=[parts[idx+1],parts[idx-1]].filter(p=>numeric.test(p||''));
     if(nearest.length){value=nearest[0];break;}
     if(parts.length<=4){const candidates=parts.filter(p=>numeric.test(p));if(candidates.length===1){value=candidates[0];break;}}
    }
    if(value!==null){metricas[field]=value;break;}
   }
  }
  return metricas;
 }
 let last='',busy=false,lastSent=0;
 async function scan(force=false){
  if(busy)return {ok:false,message:'Leitura em andamento'};
  const metricas=read(),serialized=JSON.stringify(metricas);
  if(!force&&serialized===last&&Date.now()-lastSent<30000)return {ok:true,found:Object.keys(metricas).length,cached:true};
  busy=true;
  try{
   const result=await chrome.runtime.sendMessage({type:'V2J_SHOPEE_CREATOR_METRICS',metricas});
   if(result?.ok){last=serialized;lastSent=Date.now();}
   return {ok:!!result?.ok,found:Object.keys(metricas).length,error:result?.error};
  }catch(e){return {ok:false,error:String(e.message||e)};}finally{busy=false;}
 }
 chrome.runtime.onMessage.addListener((message,_sender,respond)=>{
  if(message?.type!=='V2J_SHOPEE_FORCE_SCAN')return;
  scan(true).then(respond);return true;
 });
 setTimeout(scan,1500);setInterval(scan,10000);
})();
