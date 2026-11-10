// Diagnóstico sob demanda: somente nomes de campos, presença de valores e estrutura do chat.
// Não coleta mensagens, identificadores pessoais, URLs, cookies ou corpos de respostas.
(() => {
  if (window.__v2jFieldAudit) return;
  window.__v2jFieldAudit = true;
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const fold = value => normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = {
    comentarios: /^(?:comentarios?(?: totais)?|comments?(?: total)?|chat messages?)$/i,
    curtidas: /^(?:curtidas?|likes?|like count)$/i,
    visualizacoes: /^(?:visualizacoes?(?: totais)?|views?|watch views?|view count|watch pv)$/i,
    carrinhos: /^(?:atc|adicoes? ao carrinho|itens adicionados ao carrinho|add(?:ed|itions)? to cart|cart adds?)$/i,
    cliques: /^(?:cliques?(?: no produto)?|product clicks?|clicks?)$/i,
    pedidos: /^(?:pedidos?(?: realizados)?|orders?|order count)$/i,
    vendas: /^(?:vendas?|sales|revenue|gmv)$/i,
    espectadores: /^(?:espectadores?(?: atuais)?|assistindo agora|usuarios online|ccu|pcu|viewers?|current viewers?|online viewers?)$/i,
    compartilhamentos: /^(?:compartilhamentos?|shares?|share count)$/i
  };
  const chatSelectors = [
    '[data-testid*="comment" i]', '[data-testid*="chat" i]',
    '[class*="comment-item" i]', '[class*="commentitem" i]',
    '[class*="chat-message" i]', '[class*="chatmessage" i]',
    '[class*="message-item" i]', '[class*="messageitem" i]',
    '[role="log"]', '[aria-live="polite"]'
  ];
  const number = /^(?:(?:R\$\s*)?\d[\d.,]*\s*%?|\d{1,2}:\d{2}(?::\d{2})?)$/;
  const visible = element => !!element.getClientRects().length;
  function audit() {
    const leaves = [...document.querySelectorAll('span,div,p,strong,small,label,td')]
      .filter(element => !element.children.length && visible(element) && normalize(element.textContent).length < 85);
    const fields = {};
    for (const [field, pattern] of Object.entries(terms)) {
      const labels = leaves.filter(element => pattern.test(fold(element.textContent)));
      let nearbyValues = 0;
      for (const leaf of labels.slice(0, 25)) {
        const siblings = [...(leaf.parentElement?.querySelectorAll('span,div,p,strong,small,label,td') || [])]
          .filter(element => !element.children.length && element !== leaf && visible(element));
        if (siblings.some(element => number.test(normalize(element.textContent)))) nearbyValues++;
      }
      fields[field] = { rotulosVisiveis: labels.length, rotulosComNumerosProximos: nearbyValues };
    }
    const chat = Object.fromEntries(chatSelectors.map(selector => {
      let count = 0;
      try { count = [...document.querySelectorAll(selector)].filter(visible).length; } catch { /* seletor indisponível */ }
      return [selector, count];
    }));
    return {
      plataforma: location.hostname.includes('shopee') ? 'shopee' : 'tiktok',
      pagina: location.hostname + location.pathname.replace(/\d{6,}/g, ':id'),
      data: new Date().toISOString(),
      campos: fields, estruturasChat: chat,
      observacao: 'Somente presença de rótulos e candidatos; nenhuma mensagem, texto de usuário ou valor de venda foi exportado.'
    };
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'V2J_FIELD_AUDIT') respond({ ok: true, diagnostico: audit() });
  });
})();
