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
    if(auto){lastPayload='';scan(true);timer=setInterval(async()=>{const items=apiItems.length?apiItems:extract();if(items.length&&JSON.stringify(items)!==lastPayload)await sync(items);},8000);}
    respond({ok:true,auto});return;
  }
  if(msg?.type==='V2J_STATUS'){respond({...lastStatus,auto});return;}
});
if(/^\/view\/product\/\d+/.test(location.pathname)){
 const meta=name=>document.querySelector('meta[property="'+name+'"]')?.content||'';
 const id=location.pathname.match(/\/(\d+)/)?.[1]||'';
 const imageSet=new Set();
 let lastSent='',busy=false;
 function readDescription(){
   const maxLength=2800;
   const headingPattern=/^Descri(?:ç|c)ão do produto\s*:?$/i;
   const stop=/^(Avalia(?:ç|c)ões|Coment(?:á|a)rios|Produtos? (?:relacionados?|recomendados?|similares?)|Voc(?:ê|e) tamb(?:é|e)m pode gostar|Recomenda(?:ç|c)ões|Mais produtos|Sobre a loja|Pol(?:í|i)tica de devolu(?:ç|c)ão|Entrega(?: e frete)?|Frete(?: gr(?:á|a)tis)?|Perguntas e respostas|Comprar agora|Adicionar (?:ao carrinho|à sacola)|Compartilhar|Denunciar|Vendido por|Selecionar op(?:ç|c)ões|Avalie este produto|Ver todos os coment(?:á|a)rios|Produtos da loja|Para voc(?:ê|e)|Voc(?:ê|e) pode gostar|Descri(?:ç|c)ão da loja)\b/i;
   const cleanSection=raw=>{
     const lines=String(raw||'').split(/\n/).map(s=>s.trim()).filter(Boolean);
     const start=lines.findIndex(s=>headingPattern.test(s));
     if(start<0)return '';
     const selected=[];
     for(const line of lines.slice(start+1)){
       if(stop.test(line))break;
       if(/^(?:\d[.,]?\d?\s*★|\d+[.,]?\d*\s*(?:vendidos?|avalia(?:ç|c)ões)|R\$\s*\d|[-−]?\d+%\s*R\$)/i.test(line))break;
       if(selected.join('\n').length+line.length>maxLength)break;
       selected.push(line);
     }
     const text=selected.join('\n').trim();
     return text.length>=55?text:'';
   };
   // Apenas contêineres pequenos ligados ao título exato da descrição.
   const headings=[...document.querySelectorAll('h1,h2,h3,h4,div,span,p,strong')]
     .filter(el=>el.childElementCount===0&&headingPattern.test((el.textContent||'').trim()));
   for(const heading of headings){
     let parent=heading.parentElement;
     for(let depth=0;depth<3&&parent;depth++,parent=parent.parentElement){
       const raw=parent.innerText||'';
       if(raw.length>70&&raw.length<=3400){
         const text=cleanSection(raw);
         if(text)return text;
       }
     }
   }
   // Alguns layouts renderizam a descrição em um contêiner próprio.
   const specific=[...document.querySelectorAll('[data-e2e*="description"],[class*="product-description"],[class*="ProductDescription"]')];
   for(const section of specific){
     const raw=section.innerText||'';
     if(raw.length>70&&raw.length<=3400){
       const text=cleanSection(raw);
       if(text)return text;
     }
   }
   // Não usar document.body: inclui produtos recomendados e elementos de navegação.
   return '';
 }
 function readColors(){
   const found=new Set();
   const nodes=[...document.querySelectorAll('div,span,p,label,strong')].filter(el=>el.childElementCount===0&&/^Cor\s*:/i.test(clean(el.textContent)));
   for(const node of nodes){
     let parent=node.parentElement;
     for(let depth=0;depth<3&&parent;depth++,parent=parent.parentElement){
       const raw=parent.innerText||'';
       if(raw.length<15||raw.length>800)continue;
       const lines=raw.split(/\n/).map(clean).filter(Boolean);
       const idx=lines.findIndex(s=>/^Cor\s*:/i.test(s));
       if(idx<0)continue;
       const selected=lines[idx].replace(/^Cor\s*:\s*/i,'').trim();
       if(selected&&selected.length<40)found.add(selected);
       for(const line of lines.slice(idx+1,idx+18)){
         if(/^(Tamanho|Quantidade|Comprar|Adicionar|Selecionar|R\$)/i.test(line))break;
         if(line.length>1&&line.length<35&&!/^\d+$/.test(line))found.add(line);
       }
       break;
     }
   }
   const body=document.body?.innerText||'';
   const option=body.match(/Selecionar opções\s+([^\n]{2,40})/i)?.[1]||'';
   const color=option.split(/[,/]/)[0].trim();
   if(color&&color.length<30)found.add(color);
   return [...found].slice(0,20);
 }
 function capture(){
  if(busy||!id)return;
  const nome=clean(meta('og:title')||document.querySelector('h1')?.textContent||document.title);
  if(nome.length<5)return;
  const first=meta('og:image');if(/^https:\/\//.test(first))imageSet.add(first);
  for(const img of document.querySelectorAll('img')){
    const url=img.currentSrc||img.src;
    const top=img.getBoundingClientRect().top+window.scrollY;
    if(/^https:\/\//.test(url)&&img.naturalWidth>=260&&img.naturalHeight>=260&&top>=0&&top<1200)imageSet.add(url);
  }
  const descricao=readDescription();
  const cores=readColors();
  const imagens=[...imageSet].slice(0,12);
  const payload={id,link:location.href,nome,descricao,imagem:imagens[0]||'',imagens,cores};
  const serialized=JSON.stringify(payload);
  if(serialized===lastSent)return;
  busy=true;
  chrome.runtime.sendMessage({type:'V2J_CAPTURE',product:payload},res=>{
    busy=false;
    if(!chrome.runtime.lastError&&res?.ok)lastSent=serialized;
  });
 }
 setTimeout(capture,2200);
 window.addEventListener('scroll',()=>{clearTimeout(window.__v2jDetailTimer);window.__v2jDetailTimer=setTimeout(capture,500);},{passive:true});
 const observer=new MutationObserver(()=>{clearTimeout(window.__v2jDetailTimer);window.__v2jDetailTimer=setTimeout(capture,700);});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 setInterval(capture,5000);
 if(new URLSearchParams(location.search).get('v2j_batch')==='1'){
   // Somente em abas abertas pelo usuário por meio do lote.
   setTimeout(()=>{window.scrollTo({top:Math.min(document.body.scrollHeight/2,1600),behavior:'instant'});capture();},3500);
   setTimeout(()=>{window.scrollTo({top:Math.min(document.body.scrollHeight-400,3000),behavior:'instant'});capture();},7000);
   setTimeout(capture,10500);
 }
}