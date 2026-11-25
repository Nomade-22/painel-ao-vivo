import {getCache,usesDatabase} from '../lib/state-store.js';
const validMode = mode => ['texto','tela','central','video'].includes(mode) ? mode : 'texto';

const defaultCentral={liveMetricas:{cliques:null,vendas:null,visualizacoes:null,carrinhos:null,curtidas:null,compartilhamentos:null,exibicoesRegistradas:null,seguidoresNovos:null,gmv:'',atualizadoEm:0},produto:{nome:'',descricao:'',preco:'',imagens:[]},recado:'',chat:[],catalogo:[],itemAtivo:0,fichaCapturada:null,liveEventos:[],versao:0};
const trim=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
// Os sinais TikTok ficam em cache separado para não disputar gravações com
// comentários, ficha, seleção de produto e métricas da transmissão.
const TIKTOK_SIGNAL_TYPES=['pin','coupon','trends','governance','relation'];
const TIKTOK_SERIES=['gmv','paidGmv','order','orders','comment','comments','ccu','watch_pv','atc','addToCart','click','clicks'];
function cleanTikTokSignal(raw){
 if(!raw||typeof raw!=='object'||!TIKTOK_SIGNAL_TYPES.includes(raw.kind)||raw.httpOk!==true)return null;
 const signal={kind:raw.kind,httpOk:true,at:Date.now()};
 if(typeof raw.apiOk==='boolean')signal.apiOk=raw.apiOk;
 signal.campos=(Array.isArray(raw.campos)?raw.campos:[]).filter(k=>
  typeof k==='string'&&/^[A-Za-z][A-Za-z0-9_]{1,40}$/.test(k)&&
  !/token|cookie|auth|secret|uuid|session|userid|device|sign|password/i.test(k)).slice(0,20);
 if(raw.kind==='coupon'&&Number.isInteger(raw.linhas)&&raw.linhas>=0&&raw.linhas<=1000)signal.linhas=raw.linhas;
 if(raw.kind==='trends'&&raw.series&&typeof raw.series==='object'){
  signal.series=Object.fromEntries(TIKTOK_SERIES.filter(k=>
   Number.isInteger(raw.series[k])&&raw.series[k]>=0&&raw.series[k]<=1000).map(k=>[k,raw.series[k]]));
 }
 if(raw.kind==='pin'&&/^[0-9]{3,24}$/.test(String(raw.possibleProductId||'')))
  signal.possibleProductId=String(raw.possibleProductId);
 if(raw.kind==='governance'){
  if(typeof raw.isWarned==='boolean')signal.isWarned=raw.isWarned;
  if(typeof raw.isTerminated==='boolean')signal.isTerminated=raw.isTerminated;
 }
 return signal;
}
const safeCount=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?Math.floor(v):null;
function cleanCentral(input){
 const p=input?.produto||{};
 return {liveMetricas:{
  cliques:safeCount(input?.liveMetricas?.cliques),
  vendas:safeCount(input?.liveMetricas?.vendas),
  visualizacoes:safeCount(input?.liveMetricas?.visualizacoes),
  carrinhos:safeCount(input?.liveMetricas?.carrinhos),
  curtidas:safeCount(input?.liveMetricas?.curtidas),
  compartilhamentos:safeCount(input?.liveMetricas?.compartilhamentos),
  exibicoesRegistradas:safeCount(input?.liveMetricas?.exibicoesRegistradas),
  seguidoresNovos:safeCount(input?.liveMetricas?.seguidoresNovos),gmv:trim(input?.liveMetricas?.gmv,80),atualizadoEm:Number(input?.liveMetricas?.atualizadoEm)||0
 },liveSessaoId:/^\d{4,24}$/.test(String(input?.liveSessaoId||''))?String(input.liveSessaoId):null,liveSessaoAt:Number(input?.liveSessaoAt)||0,produto:{nome:trim(p.nome,160),descricao:trim(p.descricao,5000),preco:trim(p.preco,80),link:typeof p.link==='string'&&/^https:\/\/shop\.tiktok\.com\/view\/product\/\d+/i.test(p.link)?p.link.slice(0,500):'',
 imagens:(Array.isArray(p.imagens)?p.imagens:[]).slice(0,6).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<=2000)},
 recado:trim(input?.recado,1200),
 liveEventos:(Array.isArray(input?.liveEventos)?input.liveEventos:[]).slice(-160).map(e=>({
 id:trim(e?.id,120),
 tipo:['comentario','seguidor','pedido','atividade','produto_visto','carrinho'].includes(e?.tipo)?e.tipo:'atividade',
 autor:trim(e?.autor,100),texto:trim(e?.texto,500),hora:trim(e?.hora,12),
 numeroProduto:Number.isInteger(Number(e?.numeroProduto))&&Number(e.numeroProduto)>0&&Number(e.numeroProduto)<=999?Number(e.numeroProduto):null,
 origem:e?.origem==='aviso_tiktok'?'aviso_tiktok':'outro',
 recebidoEm:Number.isFinite(Number(e?.recebidoEm))&&Number(e.recebidoEm)>0?Number(e.recebidoEm):0
 })).filter(e=>e.id&&e.texto&&(!['produto_visto','carrinho'].includes(e.tipo)||e.numeroProduto!==null)),
 chat:(Array.isArray(input?.chat)?input.chat:[]).slice(-40).map(m=>({id:trim(m?.id,90),autor:trim(m?.autor,80),texto:trim(m?.texto,400),hora:trim(m?.hora,12)})).filter(m=>m.texto),
 catalogo:(Array.isArray(input?.catalogo)?input.catalogo:[]).slice(0,200).map(p=>({
 numero:Math.max(1,Math.min(999,Math.floor(Number(p?.numero)||0))),
 nome:trim(p?.nome,180),preco:trim(p?.preco,80),descricao:trim(p?.descricao,3000),
 link:typeof p?.link==='string'&&/^https:\/\/shop\.tiktok\.com\/view\/product\/\d+/i.test(p.link)?p.link.slice(0,500):'',
 imagem:typeof p?.imagem==='string'&&/^https:\/\//i.test(p.imagem)&&p.imagem.length<=2000?p.imagem:'',
 cores:(Array.isArray(p?.cores)?p.cores:[]).slice(0,20).map(v=>trim(v,45)).filter(Boolean),
 imagens:(Array.isArray(p?.imagens)?p.imagens:[]).slice(0,12).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<=2000),
 estoque:Number.isFinite(Number(p?.estoque))&&p?.estoque!==''&&p?.estoque!=null?Math.max(0,Math.floor(Number(p.estoque))):null,
 loja:trim(p?.loja,160),categoria:trim(p?.categoria,120),comissao:trim(p?.comissao,80),
 taxaComissao:Number.isFinite(Number(p?.taxaComissao))?Number(p.taxaComissao):0,
 precoOriginal:trim(p?.precoOriginal,80),precoOferta:trim(p?.precoOferta,80),
 ofertaInicio:trim(p?.ofertaInicio,40),ofertaFim:trim(p?.ofertaFim,40),
 atualizadoEm:Number(p?.atualizadoEm)||0,
 origem:p?.origem==='tiktok'?'tiktok':'manual'
 })).filter(p=>p.numero&&p.nome),
 itemAtivo:Math.max(0,Math.min(999,Math.floor(Number(input?.itemAtivo)||0))),
 fichaCapturada:input?.fichaCapturada?{
 id:trim(input.fichaCapturada.id,40),nome:trim(input.fichaCapturada.nome,160),
 descricao:trim(input.fichaCapturada.descricao,5000),
 imagem:typeof input.fichaCapturada.imagem==='string'&&/^https:\/\//i.test(input.fichaCapturada.imagem)?input.fichaCapturada.imagem.slice(0,2000):'',
 link:typeof input.fichaCapturada.link==='string'&&/^https:\/\/shop\.tiktok\.com\/view\/product\/\d+/i.test(input.fichaCapturada.link)?input.fichaCapturada.link.slice(0,500):'',
 capturadoEm:Number(input.fichaCapturada.capturadoEm)||0
 }:null,
 syncSacola:input?.syncSacola&&typeof input.syncSacola==='object'?{at:Number(input.syncSacola.at)||0,recebidos:Math.max(0,Number(input.syncSacola.recebidos)||0),aceitos:Math.max(0,Number(input.syncSacola.aceitos)||0)}:null,
 versao:Number(input?.versao)||0};
}
export default async function handler(req,res){
 const retryable=['sync','capture','live','select','tiktok_sinais'].some(k=>req.query?.[k]==='1');
 for(let attempt=0;attempt<3;attempt++){
  try{return await handle(req,res);}catch(e){
   if(e?.code!=='V2J_CONFLICT'||!retryable||attempt===2)return res.status(e?.code==='V2J_CONFLICT'?409:503).json({erro:e?.code==='V2J_CONFLICT'?'Estado atualizado por outro dispositivo; sincronize e tente novamente.':'Controle de retorno indisponível'});
  }
 }
}
async function handle(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET' && req.method!=='PUT'){
  res.setHeader('Allow','GET, PUT'); return res.status(405).json({erro:'Método inválido'});
 }
 try{
  if(req.query?.tiktok_sinais==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const payload=typeof req.body==='string'?JSON.parse(req.body):req.body;
   const sinal=cleanTikTokSignal(payload?.sinal);
   if(!sinal)return res.status(400).json({erro:'Sinal TikTok inválido'});
   const cache=getCache({namespace:'central-retorno-v1'});
   const previous=await cache.get('tiktok-sinais-v16')||{};
   const current=previous[sinal.kind];
   // Leituras repetidas da mesma resposta apenas renovam o horário da rota.
   const next={...previous,[sinal.kind]:sinal};
   await cache.set('tiktok-sinais-v16',next,{ttl:2592000,name:'Diagnóstico das rotas TikTok V2J'});
   return res.status(200).json({ok:true,kind:sinal.kind,campos:sinal.campos.length});
  }
  if(req.query?.live==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const payload=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!payload||typeof payload!=='object')return res.status(400).json({erro:'Dados inválidos'});
   const cacheLive=getCache({namespace:'central-retorno-v1'});
   const current=cleanCentral(await cacheLive.get('estado')||defaultCentral);
   const incoming=Array.isArray(payload.eventos)?payload.eventos.slice(-40):[];
   const room=/^\d{4,24}$/.test(String(payload.sessaoId||''))?String(payload.sessaoId):null;
   const observed=Number(payload.observadoEm)||Date.now();
   const changed=room&&current.liveSessaoId&&room!==current.liveSessaoId;
   if(changed&&observed<current.liveSessaoAt)return res.status(409).json({erro:'Sessão anterior ignorada'});
   if(changed)await cacheLive.set('historico-live-'+current.liveSessaoId,{metricas:current.liveMetricas,eventos:current.liveEventos,encerramentoObservadoEm:Date.now()},{ttl:2592000});
   const baseEvents=changed?[]:current.liveEventos;
   const ids=new Set(baseEvents.map(e=>e.id));
   const fresh=incoming.filter(e=>{if(typeof e?.id!=='string'||ids.has(e.id))return false;ids.add(e.id);return true;});
   const metrics=payload.metricas||{};
   const updatedMetrics={...(changed?defaultCentral.liveMetricas:current.liveMetricas)};
   if(Number.isFinite(metrics.cliques)&&metrics.cliques>=0)updatedMetrics.cliques=Math.floor(metrics.cliques);
   if(Number.isFinite(metrics.vendas)&&metrics.vendas>=0)updatedMetrics.vendas=Math.floor(metrics.vendas);
   if(Number.isFinite(metrics.visualizacoes)&&metrics.visualizacoes>=0)updatedMetrics.visualizacoes=Math.floor(metrics.visualizacoes);
   for(const field of ['carrinhos','curtidas','compartilhamentos','exibicoesRegistradas','seguidoresNovos'])if(Number.isFinite(metrics[field])&&metrics[field]>=0)updatedMetrics[field]=Math.floor(metrics[field]);
   if(typeof metrics.gmv==='string'&&/^R\$\s*[\d.,]+$/.test(metrics.gmv.trim()))updatedMetrics.gmv=metrics.gmv.trim().slice(0,80);
   if(updatedMetrics.cliques!==current.liveMetricas.cliques||updatedMetrics.vendas!==current.liveMetricas.vendas||updatedMetrics.visualizacoes!==current.liveMetricas.visualizacoes||updatedMetrics.carrinhos!==current.liveMetricas.carrinhos||updatedMetrics.curtidas!==current.liveMetricas.curtidas||updatedMetrics.compartilhamentos!==current.liveMetricas.compartilhamentos||updatedMetrics.exibicoesRegistradas!==current.liveMetricas.exibicoesRegistradas||updatedMetrics.gmv!==current.liveMetricas.gmv)updatedMetrics.atualizadoEm=Date.now();
   if(!fresh.length&&!changed&&(!room||room===current.liveSessaoId)&&updatedMetrics.seguidoresNovos===current.liveMetricas.seguidoresNovos&&updatedMetrics.atualizadoEm===current.liveMetricas.atualizadoEm)return res.status(200).json({ok:true,novos:0});
   const next=cleanCentral({...current,liveMetricas:updatedMetrics,liveSessaoId:room||current.liveSessaoId,liveSessaoAt:room?Math.max(observed,current.liveSessaoAt):current.liveSessaoAt,liveEventos:[...baseEvents,...fresh].slice(-160),versao:Math.max(Date.now(),Number(current.versao||0)+1)});
   await cacheLive.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,novos:fresh.length});
  }
  if(req.query?.capture==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const payload=typeof req.body==='string'?JSON.parse(req.body):req.body;
   const productUrl=String(payload?.link||'');
   const match=productUrl.match(/^https:\/\/shop\.tiktok\.com\/view\/product\/(\d+)/i);
   if(!match)return res.status(400).json({erro:'Link inválido'});
   const cacheCapture=getCache({namespace:'central-retorno-v1'});
   const current=cleanCentral(await cacheCapture.get('estado')||defaultCentral);
   const fichaCapturada={id:match[1],link:productUrl.slice(0,500),nome:trim(payload.nome,160),
    descricao:trim(payload.descricao,5000),imagem:typeof payload.imagem==='string'&&/^https:\/\//i.test(payload.imagem)?payload.imagem.slice(0,2000):'',
    capturadoEm:Date.now()};
   const colors=(Array.isArray(payload?.cores)?payload.cores:[]).slice(0,20).map(v=>trim(v,45)).filter(Boolean);
   const images=(Array.isArray(payload?.imagens)?payload.imagens:[]).slice(0,12).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<=2000);
   const catalogo=current.catalogo.map(item=>{
    if(!item.link.includes('/view/product/'+match[1]))return item;
    const currentImages=Array.isArray(item.imagens)?item.imagens:[];
    const mergedImages=item.origem==='manual'&&currentImages.length?currentImages:[...new Set([...currentImages,...images])].slice(0,12);
    const description=item.origem==='manual'&&item.descricao?item.descricao:
      (fichaCapturada.descricao.length>=75?fichaCapturada.descricao:item.descricao);
    return {...item,descricao:description,imagens:mergedImages,
      cores:item.origem==='manual'&&item.cores?.length?item.cores:[...new Set([...(item.cores||[]),...colors])].slice(0,20),
      imagem:item.imagem||fichaCapturada.imagem};
   });
   const next={...current,catalogo,fichaCapturada,versao:Math.max(Date.now(),Number(current.versao||0)+1)};
   await cacheCapture.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,id:match[1]});
  }
  if(req.query?.sync==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const payload=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!Array.isArray(payload?.items))return res.status(400).json({erro:'A extensão não enviou uma lista items válida'});
   const incoming=payload.items;
   if(incoming.length>200)return res.status(400).json({erro:'Muitos itens'});
   const cacheSync=getCache({namespace:'central-retorno-v1'});
   const current=cleanCentral(await cacheSync.get('estado')||defaultCentral);
   const manual=new Map(current.catalogo.filter(p=>p.origem==='manual').map(p=>[p.numero,p]));
   const imported=cleanCentral({catalogo:incoming.filter(p=>p&&Number.isInteger(Number(p.numero))&&Number(p.numero)>0&&Number(p.numero)<=999&&typeof p.nome==='string'&&p.nome.trim()).map(p=>({...p,origem:'tiktok'}))}).catalogo;
   if(incoming.length&&!imported.length)return res.status(400).json({erro:'Nenhum produto válido recebido: confira número e nome na extensão',recebidos:incoming.length,armazenados:current.catalogo.length});
   const mergedMap=new Map(current.catalogo.map(p=>[p.numero,p]));
   for(const p of imported)if(!manual.has(p.numero)){
    const previous=mergedMap.get(p.numero);
    mergedMap.set(p.numero,previous?{...p,
      descricao:p.descricao||previous.descricao,
      imagens:p.imagens?.length?p.imagens:previous.imagens,
      cores:p.cores?.length?p.cores:previous.cores,
      imagem:p.imagem||previous.imagem
    }:p);
   }
   // Correções manuais prevalecem nos campos editáveis; métricas atualizam com o TikTok.
   for(const p of imported){
    const override=manual.get(p.numero);
    if(override)mergedMap.set(p.numero,{...p,...override,
      estoque:p.estoque,loja:p.loja,categoria:p.categoria,comissao:p.comissao,
      taxaComissao:p.taxaComissao,precoOriginal:p.precoOriginal,precoOferta:p.precoOferta,
      ofertaInicio:p.ofertaInicio,ofertaFim:p.ofertaFim,atualizadoEm:p.atualizadoEm,
      imagens:override.imagens?.length?override.imagens:p.imagens});
   }
   const merged=[...mergedMap.values()].sort((a,b)=>a.numero-b.numero);
   const next={...current,catalogo:merged.slice(0,200),syncSacola:{at:Date.now(),recebidos:incoming.length,aceitos:imported.length},versao:Math.max(Date.now(),current.versao+1)};
   await cacheSync.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,recebidos:imported.length,armazenados:next.catalogo.length,storage:usesDatabase('central-retorno-v1')?'neon':'runtime-cache',versao:next.versao});
  }
  // Seleção compartilhada: o retorno altera APENAS o número ativo, sem
  // substituir métricas, comentários, recados ou a sacolinha sincronizada.
  if(req.query?.select==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   const numero=Number(body?.numero);
   if(!Number.isInteger(numero)||numero<1||numero>999)return res.status(400).json({erro:'Informe um número de 1 a 999.'});
   const cacheSelect=getCache({namespace:'central-retorno-v1'});
   const current=cleanCentral(await cacheSelect.get('estado')||defaultCentral);
   if(!current.catalogo.some(p=>p.numero===numero))return res.status(404).json({erro:'Produto #'+numero+' não encontrado na sacolinha V2J. Sincronize ou cadastre o item pelo painel.'});
   if(current.itemAtivo===numero)return res.status(200).json({ok:true,itemAtivo:numero,versao:current.versao,inalterado:true});
   const next=cleanCentral({...current,itemAtivo:numero,versao:Math.max(Date.now(),Number(current.versao||0)+1)});
   await cacheSelect.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,itemAtivo:numero,versao:next.versao});
  }
  // Edição parcial do painel: evita regravar um snapshot antigo e apagar
  // a seleção feita diretamente no retorno, ou eventos enviados pela extensão.
  if(req.query?.patch==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
   const fields=['produto','recado','chat','catalogo','itemAtivo','liveMetricas'];
   const patch=Object.fromEntries(fields.filter(key=>Object.prototype.hasOwnProperty.call(body,key)).map(key=>[key,body[key]]));
   if(!Object.keys(patch).length)return res.status(400).json({erro:'Nenhum campo editável informado'});
   const centralCache=getCache({namespace:'central-retorno-v1'});
   const current=cleanCentral(await centralCache.get('estado')||defaultCentral);
   if(patch.catalogo!==undefined&&body.baseVersion!==undefined&&Number(body.baseVersion)!==current.versao)return res.status(409).json({erro:'A sacolinha mudou durante a edição. Atualize e tente novamente.'});
   const next=cleanCentral({...current,...patch,
    ...(patch.liveMetricas&&typeof patch.liveMetricas==='object'?
      {liveMetricas:{...current.liveMetricas,...patch.liveMetricas}}:{}),
    versao:Math.max(Date.now(),Number(current.versao||0)+1)});
   await centralCache.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,versao:next.versao,estado:next});
  }
  if(req.query?.central==='1'){
   const centralCache=getCache({namespace:'central-retorno-v1'});
   if(req.method==='GET'){
    const [state,signals]=await Promise.all([centralCache.get('estado'),centralCache.get('tiktok-sinais-v16')]);
    return res.status(200).json({...cleanCentral(state||defaultCentral),sinaisTikTok:signals||{},storage:usesDatabase('central-retorno-v1')?'neon':'runtime-cache'});
   }
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
   const current=cleanCentral(await centralCache.get('estado')||defaultCentral);
   const data=cleanCentral({...current,...body,versao:Math.max(Date.now(),Number(current.versao||0)+1)});
   await centralCache.set('estado',data,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,versao:data.versao});
  }
  const cache=getCache({namespace:'painel-retorno-v1'});
  if(req.method==='GET'){
   const state=await cache.get('modo');
   return res.status(200).json({modo:validMode(state?.modo),versao:state?.versao||0});
  }
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body || !['texto','tela','central','video'].includes(body.modo))return res.status(400).json({erro:'Modo inválido'});
  const previous=await cache.get('modo');
  const state={modo:body.modo,versao:Math.max(Date.now(),Number(previous?.versao||0)+1)};
  await cache.set('modo',state,{ttl:2592000,name:'Modo do retorno OBS'});
  return res.status(200).json({ok:true,...state});
 }catch(e){if(e?.code==='V2J_CONFLICT')throw e;console.error('Retorno OBS',e);return res.status(503).json({erro:'Controle de retorno indisponível'});}
}
