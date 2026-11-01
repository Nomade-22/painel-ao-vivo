import { getCache } from '@vercel/functions';

// Sinalização temporária para WebRTC. O áudio nunca passa por esta API:
// depois da negociação ele segue criptografado diretamente entre os navegadores.
const cache = getCache({ namespace: 'painel-ao-vivo-microfone' });
const TTL = 300;
const validChannel = value => typeof value === 'string' && /^[a-f0-9]{48}$/.test(value);
const validSession = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

const parseBody = req => typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
const validDescription = (value, type) =>
  value && value.type === type && typeof value.sdp === 'string' &&
  value.sdp.length >= 20 && value.sdp.length <= 16000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const channel = req.method === 'GET' ? req.query?.channel : parseChannel(req);
  if (!validChannel(channel)) return res.status(400).json({ erro: 'Canal inválido' });

  const offerKey = 'offer:' + channel;
  const answerKey = 'answer:' + channel;

  try {
    if (req.method === 'GET') {
      const side = req.query?.side;
      if (side === 'receiver') {
        const offer = await cache.get(offerKey);
        return res.status(200).json({ offer: offer || null });
      }
      if (side === 'sender') {
        const answer = await cache.get(answerKey);
        return res.status(200).json({ answer: answer || null });
      }
      return res.status(400).json({ erro: 'Papel inválido' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ erro: 'Método inválido' });
    }

    const body = parseBody(req);
    if (!body || !validSession(body.session)) {
      return res.status(400).json({ erro: 'Sessão inválida' });
    }
    if (body.action === 'offer' || body.action === 'heartbeat') {
      if (!validDescription(body.description, 'offer')) {
        return res.status(400).json({ erro: 'Oferta inválida' });
      }
      await cache.set(offerKey, { session: body.session, description: body.description }, {
        ttl: TTL, name: 'Microfone remoto: oferta'
      });
      if (body.action === 'offer') await cache.delete(answerKey);
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'answer') {
      if (!validDescription(body.description, 'answer')) {
        return res.status(400).json({ erro: 'Resposta inválida' });
      }
      const offer = await cache.get(offerKey);
      if (!offer || offer.session !== body.session) {
        return res.status(409).json({ erro: 'Sessão não está ativa' });
      }
      await cache.set(answerKey, { session: body.session, description: body.description }, {
        ttl: TTL, name: 'Microfone remoto: resposta'
      });
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'stop') {
      const offer = await cache.get(offerKey);
      if (offer?.session === body.session) {
        await Promise.all([cache.delete(offerKey), cache.delete(answerKey)]);
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ erro: 'Ação inválida' });
  } catch (error) {
    console.error('Falha na sinalização do microfone:', error);
    return res.status(503).json({ erro: 'Sinalização temporariamente indisponível' });
  }
}

function parseChannel(req) {
  try {
    const body = parseBody(req);
    return body?.channel;
  } catch {
    return null;
  }
}
