// Observa somente respostas de mensagens do chat da LIVE aberta.
// Publica apenas mensagens com texto e remetente reconhecíveis, nunca a resposta bruta.
(() => {
  if (window.__v2jShopeeChatObserver) return;
  window.__v2jShopeeChatObserver = true;
  const isChatUrl = input => {
    try {
      const url = new URL(String(input), location.href);
      return url.protocol === 'https:' && url.hostname === 'chatroom-live.shopee.com.br' &&
        /^\/api\/v1\/fetch\/chatroom\/[^/]+\/message\/?$/.test(url.pathname);
    } catch { return false; }
  };
  const str = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const author = item => str(item?.nickname || item?.username || item?.user_name || item?.from_user?.nickname ||
    item?.sender?.nickname || item?.sender?.username || item?.user?.nickname || item?.user?.username, 80);
  const content = item => str(item?.content?.text || item?.content?.message || item?.text || item?.message?.text ||
    (typeof item?.message === 'string' ? item.message : '') || item?.msg || item?.msg_content, 400);
  const hash = value => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
    return String(h >>> 0);
  };
  const room = new URLSearchParams(location.search).get('session') || location.pathname.replace(/\d+/g, ':id');
  function extract(data) {
    const out = [], seen = new Set();
    const queue = [{ value: data, depth: 0 }];
    let traversed = 0;
    while (queue.length && traversed++ < 600 && out.length < 30) {
      const { value, depth } = queue.shift();
      if (!value || typeof value !== 'object' || depth > 5) continue;
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 100)) queue.push({ value: item, depth: depth + 1 });
        continue;
      }
      const nome = author(value), texto = content(value);
      if (nome && texto.length >= 1 && texto.length <= 400 && !/^https?:\/\//i.test(texto)) {
        const rawId = value.message_id ?? value.msg_id ?? value.messageId ?? value.id;
        const stamp = value.create_time ?? value.timestamp ?? value.sent_at ?? value.time ?? '';
        const id = str(String(rawId ?? ''), 80) || hash(nome + '|' + texto + '|' + String(stamp));
        if (!seen.has(id)) {
          seen.add(id);
          out.push({ id: 'shopee-' + hash(room + '|' + id), tipo: 'comentario', autor: nome, texto });
        }
        continue;
      }
      for (const [key, child] of Object.entries(value)) {
        if (/^(data|messages|message_list|messageList|chat_messages|list|items|result|chats)$/i.test(key) &&
            child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 });
      }
    }
    if (out.length) window.postMessage({ source: 'V2J_SHOPEE_CHAT_OBSERVER', type: 'COMMENTS', eventos: out }, location.origin);
  }
  const nativeFetch = window.fetch;
  window.fetch = function (...args) {
    const result = nativeFetch.apply(this, args);
    if (isChatUrl(typeof args[0] === 'string' ? args[0] : args[0]?.url)) {
      Promise.resolve(result).then(response => response.ok && response.clone().json().then(extract).catch(() => {})).catch(() => {});
    }
    return result;
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__v2jShopeeMessages = isChatUrl(url);
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__v2jShopeeMessages) this.addEventListener('load', () => {
      try {
        if (this.status !== 200) return;
        const body = this.responseType === 'json' ? this.response :
          (this.responseType === '' || this.responseType === 'text' ? JSON.parse(this.responseText) : null);
        extract(body);
      } catch { /* resposta em formato não compatível */ }
    }, { once: true });
    return nativeSend.apply(this, args);
  };
})();
