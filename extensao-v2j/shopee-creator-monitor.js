// Leitura somente dos rótulos e valores visíveis no Centro de Criação da Shopee.
// Não consulta endpoints internos nem captura dados de login, chat ou cookies.
(()=>{
 if(window.__v2jShopeeCreatorMonitor)return;
 window.__v2jShopeeCreatorMonitor=true;
 if(!/^\/dashboard\/live(?:\/|$)/.test(location.pathname))return;
 const fields={
  vendas:['Vendas (R$)','Vendas','Sales','GMV'],usuariosEngajados:['Usuários Engajados','Engaged Users'],comentarios:['Comentários','Comments'],atc:['ATC','Add to Cart','Cart Adds'],
  visualizacoes:['Visualizações totais','Total Views','Views'],tempoMedio:['Tempo de visualização média','Tempo de visualização médio','Average Watch Time'],
  conversoes:['Total de Conversões','Total Conversions'],gpm:['GPM (R$)','GPM'],pedidos:['Pedidos','Orders'],ads:['ADS (R$)','ADS'],
  ccu:['CCU','Current Viewers'],pcu:['PCU','Peak Viewers'],ctr:['CTR'],taxaCliquePedidos:['Taxa Cliques/Pedidos','Click to Order Rate'],
  compradores:['Compradores','Buyers'],itensVendidos:['Itens vendidos','Items Sold']
 };
 const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
 const fold=s=>normalize(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const numeric=/^(?:(?:R\$\s*)?\d[\d.,]*\s*%?|\d{1,2}:\d{2}(?::\d{2})?)$/;
 function read(){
  const metricas={};
  // Os dashboards usam grids com muitos "0" próximos. Só associamos um número
  // ao rótulo quando o menor card contém UM único candidato numérico.
  const leaves=[...document.querySelectorAll('span,div,p,small,strong,label,td')]
    .filter(e=>e.children.length===0&&e.getClientRects().length&&normalize(e.textContent).length<80);
  const allLabels=new Set(Object.values(fields).flat().map(fold));
  for(const [field,aliases] of Object.entries(fields)){
   for(const label of aliases){
    const leaf=leaves.find(e=>fold(e.textContent)===fold(label));
    if(!leaf)continue;
    let value=null;
    for(let parent=leaf.parentElement,depth=0;parent&&depth<4;parent=parent.parentElement,depth++){
     const siblings=leaves.filter(e=>parent.contains(e));
     // Atravessar o limite de um card mistura métricas: rejeitar.
     if(siblings.some(e=>e!==leaf&&allLabels.has(fold(e.textContent))))break;
     const candidate=siblings.filter(e=>e!==leaf&&numeric.test(normalize(e.textContent)));
     if(candidate.length===1){
      const a=leaf.getBoundingClientRect(),b=candidate[0].getBoundingClientRect();
      // O valor precisa estar visualmente junto do próprio rótulo.
      if(Math.abs((a.left+a.right)/2-(b.left+b.right)/2)<190&&Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<110){
       value=normalize(candidate[0].textContent);break;
      }
     }
     if(candidate.length>1)break;
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
