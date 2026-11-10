// Observador passivo, opcional e somente de metadados. Nunca lê conteúdo, headers ou query strings.
(() => {
  if (window.__v2jDiagObserver) return;
  window.__v2jDiagObserver = true;
  let enabled = false;
  let budgetStart = Date.now(), budget = 0;
  const shopee = location.hostname === 'live.shopee.com.br';
  const apiPath = input => {
    try {
      const u = new URL(String(input), location.href);
      if (shopee) {
        if (u.protocol !== 'https:' || !/(^|\.)(?:shopee\.com\.br|shopee\.com|shopeemobile\.com)$/.test(u.hostname)) return '';
        if (!/(?:^|\/)(?:api|webapi|graphql|live|stream|pc)(?:\/|$)/i.test(u.pathname)) return '';
      } else if (u.origin !== location.origin || !u.pathname.startsWith('/api/')) return '';
      // Não inclui query, tokens, IDs de usuário ou dados de produtos.
      const cleaned=u.pathname.split('/').map(segment =>
        (shopee ? segment.length>=16 : /^[a-z0-9_-]{30,}$/i.test(segment)) || /^\d{7,}$/.test(segment) ? ':id' : segment
      ).join('/');
      return (shopee ? '/shopee/'+u.hostname+cleaned : cleaned).slice(0, 180);
    } catch { return ''; }
  };
  const publish = (method, path, code, duration) => {
    if (!enabled || !path) return;
    const now = Date.now();
    if (now - budgetStart > 1000) { budgetStart = now; budget = 0; }
    if (++budget > 10) return;
    window.postMessage({ source: 'V2J_DIAG_MAIN', event: {
      at: now, method: String(method || 'GET').slice(0, 8), path,
      status: Number.isInteger(code) ? code : 0,
      ms: Math.max(0, Math.min(600000, Math.round(duration)))
    } }, location.origin);
  };
  window.addEventListener('message', e => {
    if (e.source === window && e.origin === location.origin && e.data?.source === 'V2J_DIAG_BRIDGE' && e.data?.type === 'SET_ENABLED') {
      enabled = e.data.enabled === true;
    }
  });
  const nativeFetch = window.fetch;
  window.fetch = function (...args) {
    if (!enabled) return nativeFetch.apply(this, args);
    const path = apiPath(typeof args[0] === 'string' ? args[0] : args[0]?.url);
    if (!path) return nativeFetch.apply(this, args);
    const method = args[1]?.method || args[0]?.method || 'GET';
    const start = performance.now();
    const result = nativeFetch.apply(this, args);
    Promise.resolve(result).then(r => publish(method, path, r.status, performance.now() - start),
      () => publish(method, path, 0, performance.now() - start));
    return result;
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__v2jDiagMeta = enabled ? { method, path: apiPath(url) } : null;
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const meta = this.__v2jDiagMeta;
    if (enabled && meta?.path) {
      const start = performance.now();
      this.addEventListener('loadend', () => publish(meta.method, meta.path, this.status, performance.now() - start), { once: true });
    }
    return nativeSend.apply(this, args);
  };
})();
