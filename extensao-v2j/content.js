// V2J: lê apenas os itens exibidos na página do TikTok Shop.
// Não lê cookies, credenciais nem respostas privadas da rede.
let apiItems=[], auto=false, timer=null, lastPayload='', lastStatus={found:0,sent:0,message:'Aguardando leitura'};
const clean=s=>(s||'').replace(/\s+/g,' ').trim();
const isPrice=s=>/R\$\s*\d[\d.,]*/.test(s);
const status=(patch)=>{lastStatus={...lastStatus,...patch};return lastStatus;};
function findNumber(el) {
  const leaves=[...el.querySelectorAll('span,div,button')].filter(x=>x.children.length===0);
  const values=[el,...leaves].map(x=>clean(x.innerText||x.textContent)).filter(s=>/^\d{1,3}$/.test(s));
  return values.map(Number).find(n=>n>=1&&n<=200)||0;
}
function extract() {
  const found=new Map();
  const candidates=new Set(document.querySelectorAll('li,tr,[role="row"],[class*="product"],[class*="Product"]'));
  const diagnostics={badges:0,rows:0};
  // A posição da sacolinha fica frequentemente em um irmão da imagem.
  // Começar pelo número permite encontrar o menor cartão completo.
  const leaves=[...document.querySelectorAll('span,div,button,p')].filter(el=>el.childElementCount===0 && /^\d{1,3}$/.test(clean(el.textContent)));
  for(const leaf of leaves) {
    const number=Number(clean(leaf.textContent));
    if(number<1||number>200)continue;
    diagnostics.badges++;
    let el=leaf.parentElement;
    for(let depth=0;depth<14&&el;depth++,el=el.parentElement) {
      const value=clean(el.innerText||el.textContent);
      if(value.length>900)break;
      if(isPrice(value)&&el.querySelector('img')) {
        candidates.add(el); diagnostics.rows++;
        break;
      }
    }
  }
  // Compatibilidade com listas cujo número esteja em input/badge.
  for(const img of document.querySelectorAll('img')) {
    let el=img.parentElement;
    for(let depth=0;depth<12&&el;depth++,el=el.parentElement) {
      const value=clean(el.innerText||el.textContent);
      if(value.length>900)break;
      if(isPrice(value)&&findNumber(el)) {candidates.add(el);break;}
    }
  }
  for(const el of candidates) {
    const img=el.querySelector('img[src],img[data-src]');
    if(!img)continue;
    const raw=el.innerText||el.textContent||'', value=clean(raw);
    if(value.length<12||value.length>900||!isPrice(value))continue;
    const numero=findNumber(el);
    if(!numero)continue;
    const lines=raw.split(/\n/).map(clean).filter(Boolean);
    const nome=lines.find(s=>s.length>7&&s.length<190&&!isPrice(s)&&!/^\d{1,3}$/.test(s)&&!/(estoque|desconto|comprar agora|lista de produtos|editar|excluir)/i.test(s));
    if(!nome)continue;
    const preco=value.match(/R\$\s*[\d.,]+/)?.[0]||'';
    const link=el.querySelector('a[href*="/view/product/"]')?.href||'';
    const item={numero,nome:nome.slice(0,180),preco,imagem:img.currentSrc||img.src||img.dataset.src||'',link,descricao:'',origem:'tiktok'};
    if(!found.has(numero)||value.length<(found.get(numero)._length||Infinity))found.set(numero,{...item,_length:value.length});
  }
  lastStatus.diagnostics=diagnostics;
  return [...found.values()].sort((a,b)=>a.numero-b.numero).slice(0,200).map(({_length,...item})=>item);
}
window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.source!=='V2J_BAG_OBSERVER'||event.data.type!=='PRODUCTS')return;
  const items=event.data.items;
  if(!Array.isArray(items)||items.length>200)return;
  apiItems=items.filter(p=>Number.isInteger(p.numero)&&p.numero>0&&typeof p.nome==='string');
  status({found:apiItems.length,message:'Lista do TikTok recebida: '+apiItems.length+' produtos'});
  if(auto&&apiItems.length&&JSON.stringify(apiItems)!==lastPayload)sync(apiItems);
});
function sync(items) {
  return new Promise(resolve=>{
    chrome.runtime.sendMessage({type:'V2J_SYNC',items},res=>{
      const error=chrome.runtime.lastError?.message||res?.error;
      if(error||!res?.ok)resolve(status({found:items.length,sent:0,message:'Falha no envio: '+(error||'sem resposta')}));
      else {lastPayload=JSON.stringify(items);resolve(status({found:items.length,sent:res.recebidos??items.length,message:'Sincronização concluída'}));}
    });
  });
}
async function scan(send=false) {
  if(!location.pathname.startsWith('/streamer/live/'))return status({message:'Abra o Gerenciador de LIVE do TikTok Shop'});
  const items=apiItems.length?apiItems:extract();
  status({found:items.length,message:items.length?(apiItems.length?'Produtos carregados do TikTok':'Produtos visíveis detectados'):'Nenhum produto detectado (números encontrados: '+(lastStatus.diagnostics?.badges||0)+', linhas: '+(lastStatus.diagnostics?.rows||0)+'). Abra a lista da sacolinha'});
  if(send&&items.length)return await sync(items);
  return lastStatus;
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg?.type==='V2J_SCAN'){scan(!!msg.send).then(respond);return true;}
  if(msg?.type==='V2J_AUTO'){
    auto=!!msg.enabled;
    if(timer)clearInterval(timer);
    if(auto){scan(true);timer=setInterval(async()=>{const items=apiItems.length?apiItems:extract();if(items.length&&JSON.stringify(items)!==lastPayload)await sync(items);},8000);}
    respond({ok:true,auto});return;
  }
  if(msg?.type==='V2J_STATUS'){respond({...lastStatus,auto});return;}
});
if(/^\/view\/product\/\d+/.test(location.pathname)){
 const meta=name=>document.querySelector('meta[property="'+name+'"]')?.content||'';
 setTimeout(()=>{
   const id=location.pathname.match(/\/(\d+)/)?.[1]||'';
   const nome=clean(meta('og:title')||document.querySelector('h1')?.textContent||document.title);
   if(!id||nome.length<5)return;
   chrome.runtime.sendMessage({type:'V2J_CAPTURE',product:{id,link:location.href,nome,descricao:clean(meta('og:description')),imagem:meta('og:image')}},()=>{void chrome.runtime.lastError;});
 },2500);
}
