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
 const numeric=/^(?:(?:R\$\s*)?\d[\d.,]*\s*%?|\d{2}:\d{2}:\d{2})$/;
 function read(){
  const metricas={};
  // Apenas elementos cujo texto coincide integralmente com o rótulo conhecido.
  const leaves=[...document.querySelectorAll('span,div,p,small,strong,label')].filter(e=>e.children.length===0);
  for(const [field,aliases] of Object.entries(fields)){
   for(const label of aliases){
    const leaf=leaves.find(e=>normalize(e.textContent).toLowerCase()===label.toLowerCase());
    if(!leaf)continue;
    let value=null;
    for(let parent=leaf.parentElement,depth=0;parent&&depth<3;parent=parent.parentElement,depth++){
     const parts=(parent.innerText||'').split(/\n/).map(normalize).filter(Boolean);
     const idx=parts.findIndex(p=>p.toLowerCase()===label.toLowerCase());
     if(idx>=0&&numeric.test(parts[idx+1]||'')){value=parts[idx+1];break;}
     if(parts.length===2&&parts[0].toLowerCase()===label.toLowerCase()&&numeric.test(parts[1])){value=parts[1];break;}
    }
    if(value!==null){metricas[field]=value;break;}
   }
  }
  return metricas;
 }
 let last='',busy=false;
 async function scan(){
  if(busy)return;
  const metricas=read(),serialized=JSON.stringify(metricas);
  if(!Object.keys(metricas).length||serialized===last)return;
  busy=true;
  try{
   const result=await chrome.runtime.sendMessage({type:'V2J_SHOPEE_CREATOR_METRICS',metricas});
   if(result?.ok)last=serialized;
  }catch{}finally{busy=false;}
 }
 setTimeout(scan,1500);setInterval(scan,10000);
})();
