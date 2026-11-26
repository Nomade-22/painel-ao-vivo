import {getCache,usesDatabase} from '../lib/state-store.js';
import {createHash} from 'node:crypto';
const NS='v2j-guardian-pro-v1',KEY='historico-resumido-036';
const numeric=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12?v:null;
const date=v=>typeof v==='number'&&Number.isFinite(v)&&v>=1e12&&v<=Date.now()+60000?v:null;
const label=(v,n)=>typeof v==='string'?v.replace(/[\r\n\t]/g,' ').slice(0,n):'';
const fields=['cliques','visualizacoes','totalEspectadores','atc','carrinhos','compradores','pedidos','pedidosConfirmados','pedidosPagos','gmvBrutoApi','gmvConfirmadoBrutoApi','gmvPagoBrutoApi','ctrBrutoApi','ccu','pcu','curtidas','compartilhamentos','seguidoresNovos','tempoMedioBrutoApi','duracaoMediaSegundos','espectadoresSimultaneos','taxaCliquesPedidosBrutaApi','engajadosSimultaneosApi','mediaEngajadosApi','comentariosMinuto','atcMinuto','vendas'];
const hash=x=>createHash('sha256').update(x).digest('hex').slice(0,20);
function clean(r){if(!['shopee','tiktok'].includes(r?.platform)||!/^\d{3,24}$/.test(String(r.id||''))||!date(r.updatedAt))return null;
 const ref=hash(r.platform+':'+r.id),metrics={};
 for(const k of fields){const v=numeric(r.metrics?.[k]);if(v!==null)metrics[k]=v;}
 if(typeof r.metrics?.gmv==='string'&&/^R\$\s*\d[\d.,]*$/.test(r.metrics.gmv))metrics.gmv=r.metrics.gmv.slice(0,40);
 const alerts=(Array.isArray(r.alerts)?r.alerts:[]).slice(-30).filter(a=>a&&typeof a.title==='string'&&date(a.detectedAt)).map(a=>({ref:hash(ref+'|'+a.title+'|'+(a.time||a.detectedAt)),title:label(a.title,180),severity:label(a.severity,60),penalty:label(a.penalty,100),time:date(a.time),detectedAt:date(a.detectedAt),appeal:a.appeal===true,appealStatus:numeric(a.appealStatus),ackAt:date(a.ackAt)}));
 return {ref,platform:r.platform,updatedAt:r.updatedAt,start:date(r.start),end:date(r.end),endObserved:date(r.endObserved),metrics,alerts};
}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(!['GET','PUT'].includes(req.method))return res.status(405).json({erro:'Método não permitido'});if(!usesDatabase(NS))return res.status(503).json({erro:'Neon não configurado'});for(let attempt=0;attempt<3;attempt++){try{const cache=getCache({namespace:NS});const old=await cache.get(KEY)||{sessions:[]};if(req.method==='GET')return res.status(200).json({ok:true,storage:'neon',sessions:old.sessions,limite:200,observacao:'Resumo de sessões identificadas. Indicadores não capturados permanecem ausentes.'});
 const body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!Array.isArray(body?.sessions)||body.sessions.length>25)return res.status(400).json({erro:'Formato inválido'});
 const map=new Map((old.sessions||[]).map(x=>[x.ref,x]));
 for(const r of body.sessions.map(clean).filter(Boolean)){const prev=map.get(r.ref)||{};const newer=r.updatedAt>=Number(prev.updatedAt||0);const alerts=new Map((prev.alerts||[]).map(a=>[a.ref,a]));for(const a of r.alerts){const p=alerts.get(a.ref)||{};alerts.set(a.ref,{...p,...a,detectedAt:Math.min(p.detectedAt||a.detectedAt,a.detectedAt),ackAt:a.ackAt||p.ackAt||null});}
 const next={...prev,...(newer?r:{}),ref:r.ref,platform:r.platform,start:r.start||prev.start||null,end:r.end||prev.end||null,endObserved:r.endObserved||prev.endObserved||null,metrics:newer?{...prev.metrics,...r.metrics}:prev.metrics||{},alerts:[...alerts.values()].sort((a,b)=>a.detectedAt-b.detectedAt).slice(-50)};next.estado=next.end?'encerrada':next.endObserved?'encerramento_observado':'fim_nao_confirmado';map.set(r.ref,next);}
 const sessions=[...map.values()].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,200);await cache.set(KEY,{sessions});return res.status(200).json({ok:true,storage:'neon',sessions:sessions.length});
 }catch(e){if(e?.code==='V2J_CONFLICT'&&attempt<2)continue;return res.status(e?.code==='V2J_CONFLICT'?409:503).json({erro:'Falha na sincronização do histórico Guardian'});}}}
