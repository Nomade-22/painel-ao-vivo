// V2J LIVE: leitura experimental de campos VISÍVEIS do Gerenciador de LIVE.
// Não acessa cookies, tokens, endpoints internos nem dados de outras abas.
(()=>{
 if(!location.pathname.startsWith('/streamer/live/'))return;
 const session=new URLSearchParams(location.search).get('session_id')||'live';
 const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
 let verifiedStats={},lastStatsAt=0;
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.source!=='V2J_STATS_OBSERVER'||event.data?.type!=='STATS')return;
  const incoming=event.data.metricas;
  if(!incoming||typeof incoming!=='object')return;
  const next={};
  if(Number.isFinite(incoming.vendas)&&incoming.vendas>=0)next.vendas=incoming.vendas;
  if(Number.isFinite(incoming.visualizacoes)&&incoming.visualizacoes>=0)next.visualizacoes=incoming.visualizacoes;
  if(typeof incoming.gmv==='string'&&/^R\$\s*[\d.,]+$/.test(incoming.gmv))next.gmv=incoming.gmv;
  if(Object.keys(next).length){verifiedStats={...verifiedStats,...next};lastStatsAt=Date.now();scan();}
 });
 const text=e=>normalize(e?.innerText||e?.textContent||'');
 const selector='div,span,p,small,strong,label';
 const shortLeaves=()=>[...document.querySelectorAll(selector)].filter(e=>e.children.length===0&&text(e).length<90);
 function metric(labelPattern,kind){
  for(const e of shortLeaves()){
   if(!labelPattern.test(text(e)))continue;
   let node=e.parentElement;
   for(let depth=0;node&&depth<3;node=node.parentElement,depth++){
    const val=text(node).replace(text(e),'').trim();
    if(!val||val==='--'||val==='—')continue;
    if(kind==='money'){
     const m=val.match(/R\$\s*[\d.,]+/);
     if(m)return m[0];
    }else{
     const m=val.match(/(?:^|\s)(\d{1,3}(?:\.\d{3})*|\d+)(?:\s|$)/);
     if(m)return Number(m[1].replace(/\./g,''));
    }
   }
  }
  return null;
 }
 function metrics(){
  // Retorna apenas campos com rótulo localizado; nunca estima métricas.
  const m={};
  const clicks=metric(/Cliques no produto/i,'number');
  if(Number.isFinite(clicks))m.cliques=clicks;
  // Só captura contadores explicitamente rotulados, quando visíveis no Gerenciador.
  const likes=metric(/^(?:Curtidas|Likes)$/i,'number');
  const shares=metric(/^(?:Compartilhamentos|Shares)$/i,'number');
  const cartAdds=metric(/^(?:Adições ao carrinho|Itens adicionados ao carrinho|Adds to cart)$/i,'number');
  if(Number.isFinite(likes))m.curtidas=likes;
  if(Number.isFinite(shares))m.compartilhamentos=shares;
  if(Number.isFinite(cartAdds))m.carrinhos=cartAdds;
  // Vendas e GMV só são aceitos da resposta estruturada core/stats.
  if(lastStatsAt&&Date.now()-lastStatsAt<120000)Object.assign(m,verifiedStats);
  return m;
 }
 const known=new Set();
 const stableId=(type,content)=>{let h=2166136261;const value=session+'|'+type+'|'+content;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return String(h>>>0);};
 function events(){
  const selectors=['[class*="comment-item"]','[class*="commentItem"]','[class*="message-item"]','[class*="messageItem"]','[data-testid*="comment"]','[class*="order-item"]','[class*="orderItem"]','[class*="follow-item"]','[class*="followItem"]'];
  const nodes=new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]));
  const result=[];
  for(const e of nodes){
   if(e.querySelectorAll('input,textarea').length)continue;
   const value=text(e);
   if(value.length<5||value.length>350||/aparecerão aqui|Digite algo|Todos os comentários|Todas as atividades|Você está off-line/i.test(value))continue;
   if(e.querySelectorAll('[class*="comment-item"],[class*="message-item"],[class*="order-item"]').length)continue;
   let tipo=/pedido|comprou|venda efetuada|purchase|order placed/i.test(value)?'pedido':/começou a seguir|seguiu você|followed/i.test(value)?'seguidor':'comentario';
   const pieces=(e.innerText||'').split(/\n/).map(normalize).filter(Boolean);
   const autor=pieces.length>1?pieces[0].slice(0,100):'Espectador';
   const texto=(pieces.length>1?pieces.slice(1).join(' '):value).slice(0,500);
   const id=stableId(tipo,value);
   if(known.has(id))continue;
   result.push({id,tipo,autor,texto,hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),recebidoEm:Date.now()});
  }
  return result.slice(-20);
 }
 let lastMetrics='',sending=false;
 async function scan(){
  if(sending)return;
  if(/Você está off-line/i.test(document.body.innerText||''))return;
  const metricas=metrics(),ev=events(),str=JSON.stringify(metricas);
  const selected=(await chrome.storage.local.get('v2jCommentFilter')).v2jCommentFilter||'todos';
  const filtered=ev.filter(item=>item.tipo!=='comentario'||(selected==='todos'||(selected==='perguntas'&&item.texto.includes('?'))));
  if(!filtered.length&&str===lastMetrics)return;
  sending=true;
  chrome.runtime.sendMessage({type:'V2J_LIVE',metricas,eventos:filtered},response=>{
   sending=false;
   if(chrome.runtime.lastError||!response?.ok)return;
   lastMetrics=str;
   for(const e of filtered)known.add(e.id);
   if(known.size>500){const items=[...known].slice(-300);known.clear();items.forEach(id=>known.add(id));}
  });
 }
 setInterval(scan,4000);
 setTimeout(scan,2500);
})();
