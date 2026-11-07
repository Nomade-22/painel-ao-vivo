// Apenas observa respostas de lista já solicitadas pelo próprio TikTok.
// Não inicia requisições, não lê cookies e não envia credenciais.
(() => {
  if (window.__v2jBagObserver) return;
  window.__v2jBagObserver = true;
  const matches = url => typeof url === 'string' && /\/api\/v1\/streamer_desktop\/live_product\/list(?:\?|$)/.test(url);
  const publish = data => {
    const list = data?.data?.products;
    if (data?.code !== 0 || !Array.isArray(list)) return;
    const items = list.slice(0,200).map((p,i) => ({
      numero:i+1,
      nome:String(p.title||'').slice(0,180),
      preco:String(p.format_available_price||'').slice(0,60),
      imagem:String(p.cover?.url_list?.[0]||p.cover?.thumb_url_list?.[0]||'').slice(0,1500),
      link:p.product_id ? 'https://shop.tiktok.com/view/product/'+String(p.product_id).replace(/\D/g,'') : '',
      descricao:'',
      origem:'tiktok'
    })).filter(p=>p.nome);
    window.postMessage({source:'V2J_BAG_OBSERVER',type:'PRODUCTS',items,total:list.length},location.origin);
  };
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const promise = originalFetch.apply(this,args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if(matches(url)) promise.then(r=>r.clone().json().then(publish).catch(()=>{})).catch(()=>{});
    } catch(e){}
    return promise;
  };
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method,url,...rest) {
    this.__v2jProductList = matches(String(url));
    return open.call(this,method,url,...rest);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    if(this.__v2jProductList) this.addEventListener('load',()=>{
      try {
        const raw=this.responseType==='json' ? this.response : (this.responseType===''||this.responseType==='text' ? JSON.parse(this.responseText) : null);
        publish(raw);
      }catch(e){}
    },{once:true});
    return send.apply(this,args);
  };
})();