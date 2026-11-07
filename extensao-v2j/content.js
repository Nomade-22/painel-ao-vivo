// V2J: usa apenas texto e imagens já visíveis no Gerenciador de LIVE.
// Não lê cookies, senhas ou chamadas internas da plataforma.
let active=false,lastPayload='',timer=null;
const state=document.createElement('div');
Object.assign(state.style,{position:'fixed',bottom:'14px',right:'14px',zIndex:'2147483647',padding:'8px 12px',borderRadius:'9px',background:'#123254',color:'#fff',font:'bold 12px system-ui',display:'none'});
state.textContent='V2J sincronizando…';document.documentElement.append(state);
function text(el){return (el?.innerText||'').trim().replace(/\s+/g,' ');}
function findNumber(el){
 const candidates=[...el.querySelectorAll('span,div')].filter(x=>x.children.length===0).map(x=>text(x)).filter(x=>/^\d{1,3}$/.test(x));
 return candidates.map(Number).find(n=>n>=1&&n<=200)||0;
}
function extract(){
 const result=new Map();
 // Itens da coluna da sacolinha têm miniatura, número e preço.
 const nodes=document.querySelectorAll('li,[role="row"],tr,[class*="product"],[class*="Product"]');
 for(const el of nodes){
  if(!el.querySelector('img'))continue;
  const value=text(el);
  if(value.length<8||value.length>600||!/(?:R\$\s?\d|\d[,.]\d{2})/.test(value))continue;
  const number=findNumber(el);if(!number)continue;
  const img=el.querySelector('img[src^="https://"]');
  const lines=(el.innerText||'').split(/\n/).map(s=>s.trim()).filter(Boolean);
  const name=lines.find(s=>s.length>6&&!/^R\$/.test(s)&&!/^\d{1,3}$/.test(s)&&!/(estoque|fixar|desconto)/i.test(s));
  if(!name)continue;
  const price=value.match(/R\$\s?[\d.,]+/)?.[0]||'';
  const link=el.querySelector('a[href*="/view/product/"]')?.href||'';
  const item={numero:number,nome:name.slice(0,180),preco:price,imagem:img?.src||'',link,descricao:'',origem:'tiktok'};
  if(!result.has(number)||name.length>result.get(number).nome.length)result.set(number,item);
 }
 return [...result.values()].sort((a,b)=>a.numero-b.numero).slice(0,200);
}
async function tick(){
 if(!active)return;
 const items=extract(),payload=JSON.stringify(items);
 if(!items.length){state.textContent='V2J: sem itens detectados nesta área';return;}
 if(payload===lastPayload)return;
 chrome.runtime.sendMessage({type:'V2J_SYNC',items},res=>{
  if(chrome.runtime.lastError||!res?.ok){state.textContent='V2J: falha ao sincronizar';return;}
  lastPayload=payload;state.textContent='V2J: '+res.recebidos+' itens sincronizados';
 });
}
chrome.runtime.onMessage.addListener(msg=>{
 if(msg?.type!=='V2J_TOGGLE')return;
 active=!active;state.style.display=active?'block':'none';
 if(timer)clearInterval(timer);
 if(active){tick();timer=setInterval(tick,8000);}
});

if(/^\/view\/product\/\d+/.test(location.pathname)){
 const readMeta=name=>document.querySelector('meta[property="'+name+'"]')?.content||'';
 function captureProduct(){
  const id=location.pathname.match(/\/(\d+)/)?.[1]||'';
  const title=(readMeta('og:title')||document.querySelector('h1')?.textContent||document.title||'').trim();
  const desc=(readMeta('og:description')||document.querySelector('[class*="description"]')?.innerText||'').trim();
  const image=readMeta('og:image')||document.querySelector('main img[src^="https://"]')?.src||'';
  if(!id||title.length<5||/TikTok Shop$/.test(title)&&title.length<20)return;
  chrome.runtime.sendMessage({type:'V2J_CAPTURE',product:{id,link:location.href,nome:title,descricao:desc,imagem:image}},()=>{void chrome.runtime.lastError;});
 }
 setTimeout(captureProduct,2500);
}
