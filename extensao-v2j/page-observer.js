// Apenas observa respostas de lista já solicitadas pelo próprio TikTok.
// Não inicia requisições, não lê cookies e não envia credenciais.
(() => {
  if (window.__v2jBagObserver) return;
  window.__v2jBagObserver = true;
  const matches = url => typeof url === 'string' && /\/api\/v1\/streamer_desktop\/live_product\/list(?:\?|$)/.test(url);
  const matchesStats = url => typeof url === 'string' && /\/api\/v1\/insights\/workbench\/live\/detail\/core\/stats(?:\?|$)/.test(url);
  const publishStats = payload => {
    if (payload?.code !== 0 || !payload?.data?.stats) return;
    const stats = payload.data.stats;
    const sales = Number(stats.sales);
    const views = Number(stats.watch_pv);
    const gmv = stats.gmv_local?.amount_formatted;
    const result = {};
    if (stats.sales !== undefined && Number.isFinite(sales) && sales >= 0) result.vendas = sales;
    if (stats.watch_pv !== undefined && Number.isFinite(views) && views >= 0) result.visualizacoes = views;
    if (typeof gmv === 'string' && /^R\$\s*[\d.,]+$/.test(gmv.trim())) result.gmv = gmv.trim();
    // Campos opcionais: só aceita valores numéricos explícitos da estatística.
    // Se o TikTok não os enviar, o painel mantém a métrica indisponível.
    for (const [field, aliases] of Object.entries({
      curtidas: ['like_count', 'likes'],
      compartilhamentos: ['share_count', 'shares'],
      carrinhos: ['add_to_cart_count', 'cart_add_count'],
      cliques: ['product_click_count', 'product_clicks']
    })) {
      const found = aliases.find(key => Object.prototype.hasOwnProperty.call(stats, key));
      if (!found) continue;
      const value = stats[found];
      if ((typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) && Number.isSafeInteger(Number(value)) && Number(value) >= 0) result[field] = Number(value);
    }
    if (Object.keys(result).length) window.postMessage({source:'V2J_STATS_OBSERVER',type:'STATS',metricas:result},location.origin);
  };
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
      estoque:Number.isFinite(Number(p.stock_num))?Number(p.stock_num):null,
      loja:String(p.seller_info?.shop_name||'').slice(0,160),
      categoria:String(p.category_info?.name||'').slice(0,120),
      comissao:String(p.affiliate_info?.commission_with_currency||'').slice(0,80),
      taxaComissao:Number(p.affiliate_info?.commission_rate||0)/100,
      precoOriginal:String(p.format_origin_price||p.format_product_origin_price||'').slice(0,80),
      precoOferta:String(p.flash_sale?.format_activity_price||'').slice(0,80),
      ofertaInicio:String(p.flash_sale?.begin_time||'').slice(0,40),
      ofertaFim:String(p.flash_sale?.end_time||'').slice(0,40),
      atualizadoEm:Date.now(),
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
      if(matchesStats(url)) promise.then(r=>r.clone().json().then(publishStats).catch(()=>{})).catch(()=>{});
    } catch(e){}
    return promise;
  };
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method,url,...rest) {
    this.__v2jProductList = matches(String(url));
    this.__v2jCoreStats = matchesStats(String(url));
    return open.call(this,method,url,...rest);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    if(this.__v2jProductList || this.__v2jCoreStats) this.addEventListener('load',()=>{
      try {
        const raw=this.responseType==='json' ? this.response : (this.responseType===''||this.responseType==='text' ? JSON.parse(this.responseText) : null);
        if(this.__v2jProductList) publish(raw);
        if(this.__v2jCoreStats) publishStats(raw);
      }catch(e){}
    },{once:true});
    return send.apply(this,args);
  };
})();
