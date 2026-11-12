import { createHash, timingSafeEqual } from 'node:crypto';

// Shopee Affiliate Open API — acesso exclusivamente pelo servidor.
// Variáveis de ambiente (NUNCA no navegador/repositório):
// SHOPEE_AFFILIATE_APP_ID, SHOPEE_AFFILIATE_APP_SECRET, V2J_AFFILIATE_DASHBOARD_KEY
const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';
const MAX_RESPONSE_BYTES = 650_000;
const shortText = (v, n = 140) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const validInt = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};
const gqlString = v => JSON.stringify(v);

function isAuthorized(req) {
  const required = process.env.V2J_AFFILIATE_DASHBOARD_KEY || '';
  if (required.length < 20) return false;
  const supplied = /^Bearer (.+)$/i.exec(String(req.headers.authorization || ''))?.[1] || '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(required);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function callShopee(query) {
  const id = process.env.SHOPEE_AFFILIATE_APP_ID?.trim();
  const secret = process.env.SHOPEE_AFFILIATE_APP_SECRET?.trim();
  if (!id || !secret) throw Object.assign(new Error('Credenciais da Shopee ainda não configuradas na Vercel.'), { code: 'NOT_CONFIGURED', status: 503 });
  const payload = JSON.stringify({ query });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha256').update(`${id}${timestamp}${payload}${secret}`, 'utf8').digest('hex');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let result;
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `SHA256 Credential=${id}, Timestamp=${timestamp}, Signature=${signature}`
      },
      body: payload,
      signal: controller.signal,
      cache: 'no-store'
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) throw Object.assign(new Error('A Shopee não retornou JSON.'), { code: 'BAD_RESPONSE', status: 502 });
    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_BYTES) throw Object.assign(new Error('Resposta maior que o limite de segurança.'), { code: 'OVERSIZED', status: 502 });
    try { result = JSON.parse(raw); } catch { throw Object.assign(new Error('Resposta JSON inválida.'), { code: 'BAD_JSON', status: 502 }); }
    if (!response.ok) throw Object.assign(new Error(`Shopee retornou HTTP ${response.status}.`), { code: 'SHOPEE_HTTP', status: 502 });
  } catch (error) {
    if (error?.name === 'AbortError') throw Object.assign(new Error('Shopee não respondeu em tempo hábil.'), { code: 'TIMEOUT', status: 504 });
    throw error;
  } finally { clearTimeout(timeout); }
  if (Array.isArray(result?.errors) && result.errors.length) {
    // Evita devolver queries, IDs de contas ou conteúdo potencialmente sensível dos erros.
    const codes = result.errors.map(e => e?.extensions?.code).filter(v => Number.isInteger(v) || (typeof v === 'string' && /^\d+$/.test(v)));
    throw Object.assign(new Error('Shopee recusou a consulta; confira permissões, credenciais e parâmetros.'), {
      code: 'SHOPEE_GRAPHQL', status: 502, shopeeCodes: codes.slice(0, 3)
    });
  }
  if (!result?.data || typeof result.data !== 'object') throw Object.assign(new Error('Nenhum dado retornado pela Shopee.'), { code: 'EMPTY_DATA', status: 502 });
  return result.data;
}

function buildQuery(action, body) {
  switch (action) {
    case 'products': {
      const keyword = shortText(body.keyword, 80);
      if (keyword.length < 2) throw Object.assign(new Error('Informe pelo menos 2 caracteres para buscar produtos.'), { status: 400 });
      const page = validInt(body.page, 1, 100, 1);
      const limit = validInt(body.limit, 1, 40, 15);
      return `query V2JProdutos { productOfferV2(keyword: ${gqlString(keyword)}, page: ${page}, limit: ${limit}) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate shopName } pageInfo { page limit hasNextPage } } }`;
    }
    case 'campaigns': {
      const keyword = shortText(body.keyword, 80);
      const page = validInt(body.page, 1, 100, 1);
      return `query V2JCampanhas { shopeeOfferV2(${keyword ? `keyword: ${gqlString(keyword)}, ` : ''}page: ${page}, limit: 15) { nodes { offerName offerLink imageUrl commissionRate periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }`;
    }
    case 'conversions': {
      const start = validInt(body.start, 1_600_000_000, 4_100_000_000, null);
      const end = validInt(body.end, 1_600_000_000, 4_100_000_000, null);
      if (!start || !end || end <= start || end - start > 31 * 86400 || end > Math.floor(Date.now() / 1000) + 86400) {
        throw Object.assign(new Error('Período inválido: informe até 31 dias, em timestamps Unix (segundos).'), { status: 400 });
      }
      return `query V2JConversoes { conversionReport(purchaseTimeStart: ${start}, purchaseTimeEnd: ${end}, limit: 50) { nodes { purchaseTime conversionId totalCommission utmContent orders { orderStatus items { itemName qty itemTotalCommission } } } pageInfo { hasNextPage scrollId } } }`;
    }
    case 'shortlink': {
      const text = shortText(body.url, 600);
      let url;
      try { url = new URL(text); } catch { throw Object.assign(new Error('Informe uma URL válida da Shopee.'), { status: 400 }); }
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password || !(host === 'shopee.com.br' || host.endsWith('.shopee.com.br') || host === 'shope.ee')) {
        throw Object.assign(new Error('Use um link HTTPS válido da Shopee Brasil.'), { status: 400 });
      }
      const subIds = Array.isArray(body.subIds) ? body.subIds.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean).slice(0, 5) : [];
      if (subIds.some(v => !/^[A-Za-z0-9_-]{1,50}$/.test(v))) throw Object.assign(new Error('SubIDs podem ter até 50 caracteres alfanuméricos, hífen e sublinhado.'), { status: 400 });
      return `mutation V2JLink { generateShortLink(input: { originUrl: ${gqlString(url.toString())}${subIds.length ? `, subIds: [${subIds.map(gqlString).join(', ')}]` : ''} }) { shortLink } }`;
    }
    default: throw Object.assign(new Error('Operação não permitida.'), { status: 400 });
  }
}

function normalize(action, data) {
  if (action === 'products') {
    const root = data.productOfferV2 || {};
    return { products: (root.nodes || []).slice(0, 40).map(p => ({
      id: String(p.itemId || ''), name: shortText(p.productName, 220),
      imageUrl: shortText(p.imageUrl, 700),
      productLink: shortText(p.productLink, 700), affiliateLink: shortText(p.offerLink, 700),
      minPrice: p.priceMin ?? null, maxPrice: p.priceMax ?? null,
      discountRate: p.priceDiscountRate ?? null, commissionRate: p.commissionRate ?? null,
      shop: shortText(p.shopName, 120)
    })).filter(p => p.name), pageInfo: root.pageInfo || {} };
  }
  if (action === 'campaigns') {
    const root = data.shopeeOfferV2 || {};
    return { campaigns: (root.nodes || []).slice(0, 15).map(o => ({
      name: shortText(o.offerName, 180), link: shortText(o.offerLink, 700), imageUrl: shortText(o.imageUrl, 700),
      commissionRate: o.commissionRate ?? null, start: o.periodStartTime || null, end: o.periodEndTime || null
    })), pageInfo: root.pageInfo || {} };
  }
  if (action === 'shortlink') return { shortLink: shortText(data.generateShortLink?.shortLink, 700) };
  if (action === 'conversions') {
    const root = data.conversionReport || {};
    // Sem ID do pedido, nome do comprador, endereço ou detalhes pessoais no retorno.
    const conversions = (root.nodes || []).slice(0, 50).map(v => ({
      purchaseTime: v.purchaseTime || null,
      totalCommission: v.totalCommission ?? null,
      tracking: shortText(v.utmContent, 180),
      orders: (v.orders || []).slice(0, 30).map(o => ({
        status: shortText(o.orderStatus, 30),
        items: (o.items || []).slice(0, 20).map(i => ({ name: shortText(i.itemName, 160), quantity: i.qty, commission: i.itemTotalCommission ?? null }))
      }))
    }));
    return { conversions, hasNextPage: !!root.pageInfo?.hasNextPage,
      note: 'Conversões de afiliado (não são pedidos em tempo real da LIVE). Valores sujeitos a validação.' };
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'V2J Shopee Afiliados',
      configured: !!process.env.SHOPEE_AFFILIATE_APP_ID && !!process.env.SHOPEE_AFFILIATE_APP_SECRET,
      protected: !!process.env.V2J_AFFILIATE_DASHBOARD_KEY && process.env.V2J_AFFILIATE_DASHBOARD_KEY.length >= 20,
      verified: false,
      note: 'Credenciais presentes não significam conexão validada; faça uma busca autenticada.'
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!process.env.V2J_AFFILIATE_DASHBOARD_KEY || process.env.V2J_AFFILIATE_DASHBOARD_KEY.length < 20) {
    return res.status(503).json({ error: 'DASHBOARD_NOT_CONFIGURED', message: 'Configure V2J_AFFILIATE_DASHBOARD_KEY no servidor.' });
  }
  if (!isAuthorized(req)) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Chave de acesso do painel inválida.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'BAD_REQUEST' });
    const action = shortText(body.action, 30);
    const query = buildQuery(action, body);
    const data = await callShopee(query);
    return res.status(200).json({ ok: true, action, ...normalize(action, data), fetchedAt: Date.now(), source: 'Shopee Affiliate Open API' });
  } catch (error) {
    const status = Number(error?.status) || 502;
    // Nunca registrar ou retornar segredos, payload assinado, tokens ou resposta bruta da Shopee.
    return res.status(status).json({ error: error?.code || 'REQUEST_FAILED', message: error?.message || 'Falha ao consultar Shopee.',
      ...(Array.isArray(error?.shopeeCodes) ? { shopeeCodes: error.shopeeCodes } : {}) });
  }
}
