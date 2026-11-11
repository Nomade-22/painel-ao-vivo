import { getCache } from '@vercel/functions';

// Versão 0.8.5: API + leitura complementar do chat exibido pela Shopee.
const NAMESPACE = 'v2j-shopee-retorno-v2';
const TTL = 2592000;
const FIELDS = [
  'vendas', 'usuariosEngajados', 'comentarios', 'atc', 'visualizacoes',
  'tempoMedio', 'conversoes', 'gpm', 'pedidos', 'ads', 'ccu', 'pcu',
  'ctr', 'taxaCliquePedidos', 'compradores', 'itensVendidos',
  'cliques', 'curtidas', 'compartilhamentos'
];
const cleanText = (value, limit = 100) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const cleanValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value :
  typeof value === 'string' && /^(?:(?:R\$\s*)?[\d.,]+\s*%?|\d{1,2}:\d{2}(?::\d{2})?)$/.test(value.trim()) ? value.trim().slice(0, 40) : null;
const sourceKey = source => 'fonte-081-' + source;

function cleanProducts(items) {
  if (!Array.isArray(items)) return null;
  return items.slice(0, 80).map(item => ({
    nome: cleanText(item?.nome, 180), cliques: cleanValue(item?.cliques), ctr: cleanValue(item?.ctr),
    pedidos: cleanValue(item?.pedidos), vendas: cleanValue(item?.vendas), atc: cleanValue(item?.atc)
  })).filter(item => item.nome);
}

function legacySource(legacy, source) {
  const metricas = legacy?.fontes?.[source] || {};
  const timestamp = Number(legacy?.fontesConectadas?.[source]) || 0;
  return {
    metricas, campoEm: Object.fromEntries(Object.keys(metricas).map(key => [key, timestamp])),
    heartbeatAt: timestamp, lastValidAt: timestamp && Object.keys(metricas).length ? timestamp : 0,
    camposIdentificados: Object.keys(metricas).length
  };
}

function consolidate(live, creator) {
  const metricas = {}, conflitos = {}, metricaOrigem = {};
  for (const field of FIELDS) {
    const available = ['live', 'creator'].filter(source =>
      (source === 'live' ? live : creator).metricas?.[field] !== undefined);
    if (!available.length) continue;
    const preferred = field === 'ccu' ? 'live' : 'creator';
    let selected = available.includes(preferred) ? preferred : available[0];
    if (available.length === 2) {
      const preferredTime = Number((selected === 'live' ? live : creator).campoEm?.[field]) || 0;
      const other = selected === 'live' ? 'creator' : 'live';
      const otherTime = Number((other === 'live' ? live : creator).campoEm?.[field]) || 0;
      // Dado preferido muito antigo? Exibir a outra fonte recente em vez de deixar vazio.
      if (otherTime - preferredTime > 120000) selected = other;
      if (String(live.metricas[field]) !== String(creator.metricas[field])) {
        conflitos[field] = { live: live.metricas[field], creator: creator.metricas[field], exibindo: selected };
      }
    }
    const source = selected === 'live' ? live : creator;
    metricas[field] = source.metricas[field];
    metricaOrigem[field] = { fonte: selected, atualizadoEm: Number(source.campoEm?.[field]) || 0 };
  }
  return { metricas, conflitos, metricaOrigem };
}

function normalizeChat(stored, legacy) {
  const fallback = Array.isArray(legacy?.comentariosLive) ? legacy.comentariosLive.slice(-100) : [];
  const comments = Array.isArray(stored?.comentariosLive) ? stored.comentariosLive : fallback;
  return {
    comentariosLive: comments.slice(-100),
    idsRecentes: Array.isArray(stored?.idsRecentes) ? stored.idsRecentes.slice(-2000) : comments.map(item => item.id),
    ultimoComentarioEm: stored?.ultimoComentarioEm || comments.at(-1)?.recebidoEm || 0,
    totalNovosComentarios: Number(stored?.totalNovosComentarios) || 0
  };
}

function parseDiagnostics(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const counter = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(1_000_000_000, Math.max(0, Math.floor(number))) : 0;
  };
  const result = Object.fromEntries(['respostas', 'mensagensValidas', 'respostasSemMensagens', 'falhasJson',
    'respostasComItens', 'produtosReconhecidos', 'ultimaRespostaEm',
    'domLinhasObservadas', 'domEntradas', 'domIntencoesCompra', 'domComentarios',
    'domSemAutor', 'domUltimaLeituraEm']
    .map(field => [field, counter(input[field])]));
  // Somente caminhos técnicos fixos e tipos: sem conteúdo, valores ou identificadores.
  for (const field of ['estruturaExemplo', 'estruturaItensExemplo']) {
    result[field] = (Array.isArray(input[field]) ? input[field] : [])
      .filter(value => typeof value === 'string' && /^root(?:\[\])?(?:\.[A-Za-z_]{1,31}(?:\[\])?)*(?::(?:array|object|number|string|boolean|null|undefined))?$/.test(value) &&
        !/(?:password|token|cookie|secret|authorization|session|uuid|credential)/i.test(value))
      .slice(0, 24);
  }
  return result;
}

function buildResponse(live, creator, chat, legacy) {
  const merged = consolidate(live, creator);
  const creatorProducts = Array.isArray(creator.produtos) && creator.produtos.length > 0;
  const liveProducts = Array.isArray(live.produtos) && live.produtos.length > 0;
  const productsSource = creatorProducts && (!liveProducts || (creator.produtoEm || 0) >= (live.produtoEm || 0))
    ? 'creator' : liveProducts ? 'live' : 'legado';
  return {
    versaoRetorno: '0.8.5', ...merged,
    fontes: { live: live.metricas || {}, creator: creator.metricas || {} },
    fontesConectadas: { live: live.heartbeatAt || 0, creator: creator.heartbeatAt || 0 },
    fontesMeta: {
      live: { ultimoSinalEm: live.heartbeatAt || 0, ultimasMetricasEm: live.lastValidAt || 0,
        camposIdentificados: live.camposIdentificados || 0, diagnosticoChat: live.diagnosticoChat || null },
      creator: { ultimoSinalEm: creator.heartbeatAt || 0, ultimasMetricasEm: creator.lastValidAt || 0,
        camposIdentificados: creator.camposIdentificados || 0 }
    },
    comentariosLive: chat.comentariosLive,
    saudeChat: { ultimoComentarioEm: chat.ultimoComentarioEm, totalNovosComentarios: chat.totalNovosComentarios },
    produtos: (productsSource === 'creator' ? creator.produtos : productsSource === 'live' ? live.produtos : legacy?.produtos) || [],
    produtosOrigem: productsSource,
    atualizadoEm: Math.max(live.heartbeatAt || 0, creator.heartbeatAt || 0),
    origem: 'Shopee Live + Centro de Criação',
    ultimaLeituraSuspeita: live.leituraSuspeita ? 'live' : creator.leituraSuspeita ? 'creator' : null,
    coleta: 'Métricas oficiais por fonte; comentários reconhecidos pela API ou tela; entradas e intenções de compra são apenas avisos, nunca vendas.'
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const cache = getCache({ namespace: NAMESPACE });
    const legacy = await cache.get('estado') || {};
    if (req.method === 'GET') {
      const [currentLive, currentCreator, currentChat] = await Promise.all([
        cache.get(sourceKey('live')), cache.get(sourceKey('creator')), cache.get('chat-081')
      ]);
      return res.status(200).json(buildResponse(
        currentLive || legacySource(legacy, 'live'),
        currentCreator || legacySource(legacy, 'creator'),
        normalizeChat(currentChat, legacy), legacy));
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !['live-shopee', 'creator-shopee'].includes(body.origem) ||
        !body.metricas || typeof body.metricas !== 'object' || Array.isArray(body.metricas)) {
      return res.status(400).json({ erro: 'Formato inválido' });
    }
    const source = body.origem === 'live-shopee' ? 'live' : 'creator';
    const previous = await cache.get(sourceKey(source)) || legacySource(legacy, source);
    const now = Date.now();
    const submitted = Object.fromEntries(FIELDS.map(field => [field, cleanValue(body.metricas[field])])
      .filter(([, value]) => value !== null));
    const values = Object.values(submitted);
    const suspicious = values.length >= 8 && values.every(value =>
      Number(String(value).replace('R$', '').replace(',', '.').trim()) === 0);
    const camposAceitos = suspicious ? [] : Object.keys(submitted);
    const next = {
      ...previous, heartbeatAt: now, camposIdentificados: camposAceitos.length,
      leituraSuspeita: suspicious,
      metricas: { ...(previous.metricas || {}) }, campoEm: { ...(previous.campoEm || {}) }
    };
    if (camposAceitos.length) {
      for (const field of camposAceitos) {
        next.metricas[field] = submitted[field];
        next.campoEm[field] = now;
      }
      next.lastValidAt = now;
    }
    if (source === 'live') {
      const diagnostico = parseDiagnostics(body.diagnostico);
      if (diagnostico) next.diagnosticoChat = diagnostico;
    }
    const produtos = cleanProducts(body.produtos);
    if (produtos) { next.produtos = produtos;next.produtoEm = now; }
    await cache.set(sourceKey(source), next, { ttl: TTL, name: 'V2J Shopee ' + source });

    let fresh = [], confirmadosIds = [];
    if (source === 'live' && Array.isArray(body.eventos) && body.eventos.length) {
      const current = normalizeChat(await cache.get('chat-081'), legacy);
      const ids = new Set(current.idsRecentes);
      for (const event of body.eventos.slice(0, 40)) {
        const id = cleanText(event?.id, 80), autor = cleanText(event?.autor, 80), texto = cleanText(event?.texto, 400);
        if (!/^shopee-\d{1,12}$/.test(id) || !autor || !texto) continue;
        confirmadosIds.push(id);
        if (ids.has(id)) continue;
        ids.add(id);
        fresh.push({ id, tipo: 'comentario', autor, texto,
          hora: cleanText(event?.hora, 12), recebidoEm: now });
      }
      if (fresh.length) {
        await cache.set('chat-081', {
          comentariosLive: [...current.comentariosLive, ...fresh].slice(-100),
          idsRecentes: [...ids].slice(-2000), ultimoComentarioEm: now,
          totalNovosComentarios: current.totalNovosComentarios + fresh.length
        }, { ttl: TTL, name: 'Chat Shopee V2J' });
      }
    }
    return res.status(200).json({ ok: true, versaoRetorno: '0.8.5', camposAceitos,
      confirmadosIds, novosComentarios: fresh.length, leituraSuspeita: suspicious,
      produtosAceitos: produtos?.length ?? null, ultimaConfirmacaoEm: now });
  } catch (error) {
    console.error('V2J Shopee: falha de sincronização:', error?.message || 'erro desconhecido');
    return res.status(500).json({ erro: 'Não foi possível processar o retorno da Shopee' });
  }
}
