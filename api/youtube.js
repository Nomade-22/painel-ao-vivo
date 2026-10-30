import { getCache } from '@vercel/functions';

const initial = {videoId:'', playing:false, loop:true, muted:false, volume:65, command:'0'};
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);

function parseVideoId(value) {
  if (typeof value !== 'string' || value.length > 1600) return '';
  const input = value.trim();
  if (validId(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    let id = '';
    if (host === 'youtu.be' || host === 'www.youtu.be') id = segments[0] || '';
    else if (['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host)) {
      if (segments[0] === 'watch') id = url.searchParams.get('v') || '';
      else if (['shorts','live','embed'].includes(segments[0])) id = segments[1] || '';
    }
    return validId(id) ? id : '';
  } catch { return ''; }
}

export default async function handler(req,res) {
  const cache = getCache({namespace:'painel-youtube-v1'});
  res.setHeader('Cache-Control','no-store, max-age=0');
  if (req.method === 'GET') {
    try { return res.status(200).json((await cache.get('state')) || initial); }
    catch(e) { console.error('Erro YouTube GET:',e); return res.status(503).json({error:'Controle do YouTube indisponível'}); }
  }
  if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido'});
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = body.action;
    if (!['play','pause','stop','settings'].includes(action)) return res.status(400).json({error:'Comando inválido'});
    const previous = (await cache.get('state')) || initial;
    const state = {...initial,...previous};
    if (action === 'play') {
      const id = parseVideoId(body.url || body.videoId || state.videoId);
      if (!id) return res.status(400).json({error:'Cole um link válido do YouTube (vídeo, Shorts ou youtu.be).'});
      state.videoId = id;
      state.playing = true;
    }
    if (action === 'pause') state.playing = false;
    if (action === 'stop') {state.playing = false;state.videoId = '';}
    if (typeof body.loop === 'boolean') state.loop = body.loop;
    if (typeof body.muted === 'boolean') state.muted = body.muted;
    if (body.volume !== undefined) {
      const volume = Number(body.volume);
      if (!Number.isFinite(volume) || volume < 0 || volume > 100) return res.status(400).json({error:'Volume fora do intervalo 0 a 100'});
      state.volume = Math.round(volume);
    }
    state.command = String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    await cache.set('state',state,{ttl:86400,name:'Controle YouTube OBS'});
    return res.status(200).json({ok:true,...state});
  } catch(e) {
    console.error('Erro ao controlar YouTube:',e);
    return res.status(503).json({error:'Não foi possível atualizar a reprodução'});
  }
}
