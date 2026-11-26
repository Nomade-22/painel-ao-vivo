import {getCache,usesDatabase} from '../lib/state-store.js';
import { randomUUID, createHash } from 'node:crypto';

// Versão 0.8.6: dados isolados por sessão da LIVE; reconexões não apagam histórico.
const NAMESPACE = 'v2j-shopee-retorno-v2';
const TTL = 2592000;
const ACTIVE_KEY = 'sessao-atual-086';
const chatKey = generation => generation ? 'chat-086-' + generation : 'chat-081';
const sessionLabel = id => createHash('sha256').update(id).digest('hex').slice(0, 10);
const FIELDS = [
  'vendas', 'usuariosEngajados', 'comentarios', 'atc', 'visualizacoes',
  'tempoMedio', 'conversoes', 'gpm', 'pedidos', 'ads', 'abs', 'ccu', 'pcu',
  'ctr', 'taxaCliquePedidos', 'compradores', 'itensVendidos',
  'comentariosMinuto', 'atcMinuto', 'usuariosEngajadosMinuto',
  'cliques', 'curtidas', 'compartilhamentos', 'totalEspectadores', 'taxaComentarios',
  'pedidosConfirmados', 'pedidosPagos', 'itensConfirmados', 'itensPagos',
  'gmvBrutoApi', 'gmvConfirmadoBrutoApi', 'gmvPagoBrutoApi',
  'ctrBrutoApi', 'taxaCliquesPedidosBrutaApi', 'tempoMedioBrutoApi', 'engajadosSimultaneosApi',
  'compradoresConfirmados','compradoresPagos','mediaEngajadosApi','gpmBrutoApi','gpmConfirmadoBrutoApi','gpmPagoBrutoApi','absBrutoApi','absConfirmadoBrutoApi','absPagoBrutoApi','taxaComentariosBrutaApi'
];
const cleanText = (value, limit = 100) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const cleanValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value :
  typeof value === 'string' && /^(?:(?:R\$\s*)?[\d.,]+\s*%?|\d{1,2}:\d{2}(?::\d{2})?)$/.test(value.trim()) ? value.trim().slice(0, 40) : null;
const epoch = v => typeof v==='number' && Number.isFinite(v) && v>=1e9 && v<4.2e12 ? (v<1e11?v*1000:v) : null;
const brl = v => typeof v==='number' && Number.isFinite(v) && v>=0 ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v) : null;
const countNumber = v => typeof v==='number'?v:typeof v==='string'&&/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(v.trim())?Number(v.replace(/\./g,'')):null;
const clock = v => new Date(v).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'});
const normalized = v=>String(v||'').normalize('NFC').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
const sameComment=(a,b)=>normalized(a.texto)===normalized(b.texto)&&((normalized(a.autor)===normalized(b.autor)&&Math.abs(Number(a.recebidoEm)-Number(b.recebidoEm))<=45000)||(a.hora&&b.hora&&a.hora!==b.hora&&Math.abs(Number(a.recebidoEm)-Number(b.recebidoEm))<=15000&&/^\d{2}:\d{2}$/.test(a.hora)&&/^\d{2}:\d{2}$/.test(b.hora)&&((Number(a.hora.slice(0,2))-Number(b.hora.slice(0,2))+24)%24===3||(Number(b.hora.slice(0,2))-Number(a.hora.slice(0,2))+24)%24===3)&&a.hora.slice(3)===b.hora.slice(3)));
const sourceKey = (source, generation) => generation ? 'fonte-086-' + generation + '-' + source : 'fonte-081-' + source;

function cleanProducts(items) {
  if (!Array.isArray(items)) return null;
  const safeImage = value => {
    if (typeof value !== 'string' || value.length > 600) return '';
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'https:' || !(
        host.endsWith('.susercontent.com') || host === 'susercontent.com' ||
        host.endsWith('.shopee.com.br') || host.endsWith('.shopee.io')
      )) return '';
      parsed.search = ''; parsed.hash = '';
      return parsed.toString();
    } catch { return ''; }
  };
  return items.slice(0, 200).map(item => ({
    id: cleanText(item?.id, 80), nome: cleanText(item?.nome, 180),
    numero: Number.isInteger(item?.numero) && item.numero > 0 && item.numero <= 200 ? item.numero : null,
    imagem: safeImage(item?.imagem), preco: cleanText(item?.preco, 60),
    precoAnterior: cleanText(item?.precoAnterior, 60),
    moeda: cleanText(item?.moeda, 8),
    desconto: item?.desconto !== null && Number.isFinite(Number(item?.desconto)) &&
      Number(item.desconto) >= 0 && Number(item.desconto) <= 100 ? Number(item.desconto) : null,
    cliques: cleanValue(item?.cliques), ctr: cleanValue(item?.ctr),
    pedidos: cleanValue(item?.pedidos), itensVendidos: cleanValue(item?.itensVendidos),
    vendas: cleanValue(item?.vendas), atc: cleanValue(item?.atc),
    comissao: cleanValue(item?.comissao),
    pedidosConfirmados:cleanValue(item?.pedidosConfirmados),
    pedidosPagos:cleanValue(item?.pedidosPagos),
    itensConfirmados:cleanValue(item?.itensConfirmados),
    itensPagos:cleanValue(item?.itensPagos),
    vendasBrutoApi: cleanValue(item?.vendasBrutoApi),
    vendasConfirmadasBrutoApi:cleanValue(item?.vendasConfirmadasBrutoApi),vendasPagasBrutoApi:cleanValue(item?.vendasPagasBrutoApi),
    precoMinimoBrutoApi:cleanValue(item?.precoMinimoBrutoApi),precoMaximoBrutoApi:cleanValue(item?.precoMaximoBrutoApi),
    comissaoBrutoApi: cleanValue(item?.comissaoBrutoApi),
    origem: item?.origem === 'creator' ? 'creator' : 'live',
    periodo: item?.periodo === 'visivel' ? 'visivel' : null
  })).filter(item => item.nome);
}

function mergeProducts(liveItems, creatorItems) {
  const live = (Array.isArray(liveItems) ? liveItems : []).map(item => ({...item}));
  const creator = Array.isArray(creatorItems) ? creatorItems : [];
  const normalizeName = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  for (const item of creator) {
    const target = normalizeName(item.nome);
    let matches = live.map((p, index) => ({p,index})).filter(({p}) =>
      item.id && p.id === item.id);
    if (!matches.length && target.length >= 12)
      matches = live.map((p,index)=>({p,index})).filter(({p}) =>
        normalizeName(p.nome).startsWith(target) ||
        target.startsWith(normalizeName(p.nome)));
    if (matches.length > 1 && item.preco) {
      const cents = value => {
        const raw = String(value || '').replace(/[^0-9.,]/g,'');
        return raw.includes(',') ? raw.replace(/\./g,'').replace(',','.') : raw;
      };
      const money = cents(item.preco);
      matches = matches.filter(({p}) => cents(p.preco) === money);
    }
    if (matches.length === 1) {
      const {p,index} = matches[0];
      live[index] = {...p, imagem: p.imagem || item.imagem || '',
        cliques:item.cliques ?? p.cliques, ctr:item.ctr ?? p.ctr,
        pedidos:item.pedidos ?? p.pedidos, itensVendidos:item.itensVendidos ?? p.itensVendidos,
        pedidosConfirmados:item.pedidosConfirmados ?? p.pedidosConfirmados,
        pedidosPagos:item.pedidosPagos ?? p.pedidosPagos,
        itensConfirmados:item.itensConfirmados ?? p.itensConfirmados,
        itensPagos:item.itensPagos ?? p.itensPagos,
        vendas:item.vendas ?? p.vendas, comissao:item.comissao ?? p.comissao,
        vendasBrutoApi:item.vendasBrutoApi ?? p.vendasBrutoApi,
        vendasConfirmadasBrutoApi:item.vendasConfirmadasBrutoApi??p.vendasConfirmadasBrutoApi,vendasPagasBrutoApi:item.vendasPagasBrutoApi??p.vendasPagasBrutoApi,
        comissaoBrutoApi:item.comissaoBrutoApi ?? p.comissaoBrutoApi,
        atc:item.atc ?? p.atc,
        origem:'live+creator'};
    } else {
      // Sem correspondência única, não atribuir pedidos ao produto errado.
      live.push({...item, origem:'creator', semCorrespondencia: true});
    }
  }
  return live.slice(0,200);
}


const TREND_KEYS=['gmv','paidGmv','confirmedOrder','paidOrder','confirmedGmv','order',
 'entering','ccu','engagedCcu','addToCart','comment'];
function safeNonnegative(value, max=1e12) {
 const n=Number(value);
 return value!==null&&value!==undefined&&value!==''&&Number.isFinite(n)&&n>=0&&n<=max?n:null;
}
function cleanExtras(input) {
 if (!input||typeof input!=='object'||Array.isArray(input))return {};
 const extras={};
 if(input.products&&typeof input.products==='object'){
  const p=input.products;
  extras.products={
   total:safeNonnegative(p.total,1e6),linhasRecebidas:safeNonnegative(p.linhasRecebidas,1e6),
   linhasInterpretadas:safeNonnegative(p.linhasInterpretadas,100),totalPaginas:safeNonnegative(p.totalPaginas,100),
    paginasObservadas:(Array.isArray(p.paginasObservadas)?p.paginasObservadas:[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=100).slice(0,30),
   chavesExemplo:(Array.isArray(p.chavesExemplo)?p.chavesExemplo:[])
    .filter(x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_]{1,35}$/.test(x))
    .slice(0,30),
   produtos:cleanProducts(p.produtos)||[]
  };
 }
 if(input.comments&&typeof input.comments==='object'){
  const c=input.comments;
  extras.comments={
   linhasRecebidas:safeNonnegative(c.linhasRecebidas,1e6),
   mensagensValidas:safeNonnegative(c.mensagensValidas,1e6),
   comentarios:(Array.isArray(c.comentarios)?c.comentarios:[]).slice(-60).map(x=>({
    autor:cleanText(x?.autor,70),texto:cleanText(x?.texto,320),at:epoch(x?.at)
   })).filter(x=>x.autor&&x.texto)
  };
 }
 if(input.trends&&typeof input.trends==='object'){
  const series={};
  for(const key of TREND_KEYS){
   const src=input.trends.series?.[key];
   if(!src||typeof src!=='object')continue;
   series[key]={totalPontos:safeNonnegative(src.totalPontos,1e6),
    pontos:(Array.isArray(src.pontos)?src.pontos:[]).slice(-1440).map(x=>safeNonnegative(x)),
     horarios:(Array.isArray(src.horarios)?src.horarios:[]).slice(-1440).map(epoch)
   };
  }
  extras.trends={series};
 }
 if(input.violations&&typeof input.violations==='object'){
  const v=input.violations,records=(Array.isArray(v.records)?v.records:[]).slice(0,50).filter(x=>x&&typeof x==='object').map(x=>({
     id:createHash('sha256').update(String(x.id||[x.titulo,x.horario].join('|'))).digest('hex').slice(0,16),titulo:cleanText(x.titulo,180),descricao:cleanText(x.descricao,800),gravidade:cleanText(x.gravidade,60),penalidade:cleanText(x.penalidade,300),horario:epoch(x.horario),recursoDisponivel:x.recursoDisponivel===true,apelacaoStatus:safeNonnegative(x.apelacaoStatus,1000)
    })).filter(x=>x.titulo),alert=v.isWarned===true||v.isTerminated===true||records.length>0||Number(v.contador)>0;
  extras.violations={
   isWarned:v.isWarned===true,isTerminated:v.isTerminated===true,
   titulo:alert?cleanText(v.titulo,160):'',descricao:alert?cleanText(v.descricao,340):'',
   gravidade:alert?cleanText(v.gravidade,60):'',recursoDisponivel:alert&&v.recursoDisponivel===true,records,contador:safeNonnegative(v.contador,10000)
  };
 }
 for(const k of ['viewerSource','viewerProfile','buyerProfile'])if(input[k]&&Array.isArray(input[k].grupos))extras[k]={grupos:input[k].grupos.slice(0,12).map(g=>({tipo:cleanText(g?.tipo,60),distribuicao:(Array.isArray(g?.distribuicao)?g.distribuicao:[]).slice(0,30).map(x=>({nome:cleanText(x?.nome,100),valor:safeNonnegative(x?.valor)})).filter(x=>x.nome&&x.valor!==null)}))};
 if(input.sessionInfo&&typeof input.sessionInfo==='object')extras.sessionInfo={inicio:epoch(input.sessionInfo.inicio),fim:epoch(input.sessionInfo.fim)};
 return extras;
}
// 0.8.35: apenas campos permitidos; valores brutos sem escala ficam rotulados.
function cleanLiveInsights(input){
 const out={};if(!input||typeof input!=='object'||Array.isArray(input))return out;
 const nums=(v,keys)=>Object.fromEntries(keys.filter(k=>typeof v?.[k]==='number'&&safeNonnegative(v[k])!==null).map(k=>[k,v[k]]));
 const bools=(v,keys)=>Object.fromEntries(keys.filter(k=>typeof v?.[k]==='boolean').map(k=>[k,v[k]]));
 const shape=v=>(Array.isArray(v)?v:[]).filter(k=>typeof k==='string'&&/^[A-Za-z_][A-Za-z0-9_]{0,40}:(array|null|string|number|boolean|object)$/.test(k)&&!/token|cookie|auth|secret|user|device|sign|password|email|phone/i.test(k)).slice(0,30);
 const prices=(v,keys)=>Object.fromEntries(keys.filter(k=>typeof v?.[k]==='string'&&/^(?:R\$\s*)?\d[\d.,]*$/.test(v[k])&&v[k].length<=40).map(k=>[k,v[k]]));
 for(const [k,v] of Object.entries(input).slice(0,100)){
  if(!v||typeof v!=='object'||Array.isArray(v))continue;
  if(k==='coins')out[k]=nums(v,['claim_times','claims_left','coin_reward_status','coin_status','coins_per_claim','giveout','interval','shown_coins']);
  else if(k==='coinRecord')out[k]=nums(v,['balance','coins_claimed','times_claimed','total']);
  else if(k==='voucherCounts')out[k]=nums(v,['init_cnt','manual_cnt']);
  else if(k==='vouchers')out[k]={...nums(v,['total']),...bools(v,['has_more']),fields:shape(v.fields),items:(Array.isArray(v.items)?v.items:[]).slice(0,30).map(x=>({...nums(x,['discount','discount_percentage','start_time','end_time','remaining_count','available_count']),...prices(x,['discount_amount','min_spend','face_value'])}))};
  else if(k==='asked'||k==='bag')out[k]={...nums(v,['total','total_count','max_items','next_offset','received']),...bools(v,['has_more']),fields:shape(v.fields)};
  else if(k==='safety')out[k]={...bools(v,['allow']),...nums(v,['type'])};
  else if(k==='config')out[k]={...nums(v,['quality_policy','loading_waittime']),...bools(v,['show_coin','show_dashboard','show_sort_item']),speed_test_fields:shape(v.speed_test_fields),push_control_fields:shape(v.push_control_fields)};
  else if(k==='endObserved')out[k]={at:Date.now()};
  else if(/^detail:\d{3,25}$/.test(k)&&k==='detail:'+v.id)out[k]={id:v.id,...nums(v,['discount','sp_end_time']),...prices(v,['price','price_before_discount','price_min','price_max','price_min_before_discount','price_max_before_discount']),currency:/^[A-Z]{3}$/.test(v.currency||'')?v.currency:'',...bools(v,['sp_flag','most_asked']),fields:shape(v.fields)};
 }
 return out;
}
function mergeTrends(old, incoming){
 const series={...(old?.series||{})};
 for(const [key,src] of Object.entries(incoming?.series||{})){
  const points=new Map();
  for(const part of [series[key],src])if(part)for(let i=0;i<(part.horarios||[]).length;i++){const t=part.horarios[i],v=part.pontos?.[i];if(Number.isFinite(t)&&Number.isFinite(v))points.set(t,v);}
  const rows=[...points].sort((a,b)=>a[0]-b[0]).slice(-1440);
  series[key]={totalPontos:rows.length,horarios:rows.map(x=>x[0]),pontos:rows.map(x=>x[1])};
 }
 return {series};
}
function creatorProductUnion(domProducts, apiProducts){
 const result=(Array.isArray(domProducts)?domProducts:[]).map(x=>({...x}));
 for(const item of Array.isArray(apiProducts)?apiProducts:[]){
  const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  const match=result.findIndex(p=>(item.id&&p.id===item.id) ||
   (norm(item.nome).length>=12 && norm(item.nome)===norm(p.nome)));
  if(match>=0){
   const old=result[match];
   result[match]={...old,...Object.fromEntries(Object.entries(item).filter(([k,v])=>
    v!==null&&v!==undefined&&v!==''&&
    !['preco','precoAnterior','desconto','moeda'].includes(k))),
    imagem:old.imagem||item.imagem||'',origem:'creator'};
  }else result.push({...item,origem:'creator'});
 }
 return result.slice(0,200);
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
    const available = ['live', 'creator'].filter(source => {
      const value=(source === 'live' ? live : creator).metricas?.[field];
      // The LIVE DOM has adjacent CCU/likes/shares cards; never publish these
      // two potentially misassigned values as official metrics.
      if(source==='live' && (field==='curtidas'||field==='ccu'))return false;
      return value!==undefined;
    });
    if (!available.length) continue;
    const preferred = 'creator'; // Priorizar metricas oficiais; DOM LIVE pode capturar valor de cartao adjacente.
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
  // GMV em BRL conciliado com o Excel de 23/11/2026; não confundir com GMV pago.
  for(const [to,from] of [['vendas','gmvBrutoApi'],['vendasConfirmadas','gmvConfirmadoBrutoApi'],['vendasPagas','gmvPagoBrutoApi']]){const v=brl(metricas[from]);if(v!==null){metricas[to]=v;metricaOrigem[to]=metricaOrigem[from];}}
  return { metricas, conflitos, metricaOrigem };
}

function normalizeChat(stored, legacy) {
  const fallback = Array.isArray(legacy?.comentariosLive) ? legacy.comentariosLive.slice(-100) : [];
  const comments = Array.isArray(stored?.comentariosLive) ? stored.comentariosLive : fallback;
  return {
    comentariosLive: comments.filter((x,i,a)=>!a.slice(0,i).some(y=>sameComment(x,y))).slice(-100),
    idsRecentes: Array.isArray(stored?.idsRecentes) ? stored.idsRecentes.slice(-2000) : comments.map(item => item.id),
    ultimoComentarioEm: stored?.ultimoComentarioEm || comments.at(-1)?.recebidoEm || 0,
    totalNovosComentarios: Number(stored?.totalNovosComentarios) || 0
  };
}

function parseDiagnostics(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const counter = (value, field) => {
    const number = Number(value);
    // Timestamps estão em milissegundos; não podem receber o limite de
    // contadores, senão a página interpreta 2026 como uma data de 1970.
    const upper = field === 'ultimaRespostaEm' || field === 'domUltimaLeituraEm' ? 4_102_444_800_000 : 1_000_000_000;
    return Number.isFinite(number) ? Math.min(upper, Math.max(0, Math.floor(number))) : 0;
  };
  const result = Object.fromEntries(['respostas', 'mensagensValidas', 'respostasSemMensagens', 'falhasJson',
    'respostasComItens', 'produtosReconhecidos', 'ultimaRespostaEm',
    'domLinhasObservadas', 'domEntradas', 'domIntencoesCompra', 'domComentarios',
    'domSemAutor', 'domUltimaLeituraEm','domSeguidores']
    .map(field => [field, counter(input[field], field)]));
  // Somente caminhos técnicos fixos e tipos: sem conteúdo, valores ou identificadores.
  for (const field of ['estruturaExemplo', 'estruturaItensExemplo']) {
    result[field] = (Array.isArray(input[field]) ? input[field] : [])
      .filter(value => typeof value === 'string' && /^root(?:\[\])?(?:\.[A-Za-z_]{1,31}(?:\[\])?)*(?::(?:array|object|number|string|boolean|null|undefined))?$/.test(value) &&
        !/(?:password|token|cookie|secret|authorization|session|uuid|credential)/i.test(value))
      .slice(0, 24);
  }
  return result;
}

function cleanCreatorDiagnostics(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const safeNames = items => (Array.isArray(items) ? items : []).filter(name =>
    typeof name === 'string' && /^[A-Za-z]{2,40}$/.test(name)).slice(0, 35);
  const at = Number(input.leituraEm);
  return {
    rotulos: safeNames(input.rotulos), campos: safeNames(input.campos),
    leituraEm: Number.isFinite(at) && at > 0 && at < 4102444800000 ? at : 0,
    linhasProdutos: Number.isInteger(input.linhasProdutos) && input.linhasProdutos >= 0 && input.linhasProdutos <= 80 ? input.linhasProdutos : 0,
    valoresZerados: Number.isInteger(input.valoresZerados) && input.valoresZerados >= 0 && input.valoresZerados <= 35 ? input.valoresZerados : 0,
    valoresNaoZerados: Number.isInteger(input.valoresNaoZerados) && input.valoresNaoZerados >= 0 && input.valoresNaoZerados <= 35 ? input.valoresNaoZerados : 0
  };
}

function buildResponse(live, creator, chat, legacy, active) {
  const merged = consolidate(live, creator);
  const extra=creator.extras||{};
  const creatorProducts=creatorProductUnion(creator.produtos,extra.products?.produtos);
  const liveProducts = Array.isArray(live.produtos) ? live.produtos :
    Array.isArray(legacy?.produtos) ? legacy.produtos : [];
  const productsSource = creatorProducts.length && liveProducts.length ? 'live+creator' :
    creatorProducts.length ? 'creator' : liveProducts.length ? 'live' : 'indisponivel';
  const mergedProducts = mergeProducts(liveProducts, creatorProducts).map(p=>({...p,...(live.insights?.['detail:'+p.id]?{detalhesShopee:live.insights['detail:'+p.id]}:{})}));
  const officialEnd=extra.sessionInfo?.fim;const ended=Number.isFinite(officialEnd)&&officialEnd>0&&officialEnd<=Date.now();
  return {
    versaoRetorno: '0.8.35', ...merged,
    // Subtotal verificavel das linhas comerciais recebidas; NAO total da LIVE.
    metricas: {...merged.metricas,
      ...(creatorProducts.some(p=>typeof p.cliques==='number'&&Number.isSafeInteger(p.cliques))
        ? {cliquesProdutosVisiveis:creatorProducts.reduce((sum,p)=>sum+
          (typeof p.cliques==='number'&&Number.isSafeInteger(p.cliques)&&p.cliques>=0?p.cliques:0),0)} : {})},
    metricaOrigem: {...merged.metricaOrigem,
      ...(creatorProducts.some(p=>typeof p.cliques==='number'&&Number.isSafeInteger(p.cliques))
        ? {cliquesProdutosVisiveis:{fonte:'creator',atualizadoEm:creator.extrasAtualizadosEm?.products||creator.produtoEm||creator.lastValidAt||0}}:{})},
    cliquesProdutosCobertura:{
      paginasObservadas:extra.products?.paginasObservadas||[],totalPaginas:extra.products?.totalPaginas??null,
      linhas:creatorProducts.filter(p=>typeof p.cliques==='number'&&Number.isSafeInteger(p.cliques)).length,
      total:extra.products?.total??creatorProducts.length,
      limitacao:'Subtotal das linhas comerciais recebidas; nao representa o total da LIVE.'
    },
    sessao: active ? { identificada: true, referencia: sessionLabel(active.id), iniciadaEm: active.createdAt, inicioOficial:extra.sessionInfo?.inicio??null, fimOficial:extra.sessionInfo?.fim??null, estado:ended?'encerrada':live.insights?.endObserved?'encerramento_observado':'não_confirmado', atualizadaEm: active.lastSeenAt } :
      { identificada: false, referencia: null, iniciadaEm: 0 },
    fontes: { live: live.metricas || {}, creator: creator.metricas || {} },
    fontesConectadas: { live: live.heartbeatAt || 0, creator: creator.heartbeatAt || 0 },
    fontesMeta: {
      live: { ultimoSinalEm: live.heartbeatAt || 0, ultimasMetricasEm: live.lastValidAt || 0,
        camposIdentificados: live.camposIdentificados || 0, diagnosticoChat: live.diagnosticoChat || null },
      creator: { ultimoSinalEm: creator.heartbeatAt || 0, ultimasMetricasEm: creator.lastValidAt || 0,
        camposIdentificados: creator.camposIdentificados || 0,
        diagnosticoCreator: creator.diagnosticoCreator || null, versaoLeitor: creator.versaoLeitor || '',
        origemLeitura: creator.origemLeitura || 'não informada' }
    },
    comentariosLive: chat.comentariosLive,
    saudeChat: { ultimoComentarioEm: chat.ultimoComentarioEm, totalNovosComentarios: chat.totalNovosComentarios },
    produtos: mergedProducts,
    produtosCreator: creatorProducts,
    produtosApi:extra.products||null,
    tendenciasCreator:extra.trends||null,
    historicoAudiencia:creator.historicoAudiencia||extra.trends||null,
    insightsShopee:live.insights||{}, insightsAtualizadosEm:live.insightsAtualizadosEm||{},
    rankingProdutos:creatorProducts.filter(p=>Number.isFinite(p.cliques)||Number.isFinite(p.atc)).slice().sort((a,b)=>(b.cliques||0)-(a.cliques||0)).slice(0,20),
    comentariosApiDiagnostico:extra.comments?{
     linhasRecebidas:extra.comments.linhasRecebidas,
     mensagensValidas:extra.comments.mensagensValidas
    }:null,
    alertaCreator:extra.violations||null,
    publicoCreator:{origem:extra.viewerSource||null,perfil:extra.viewerProfile||null,compradores:extra.buyerProfile||null},
    extrasAtualizadosEm:creator.extrasAtualizadosEm||{},
    produtosOrigem: productsSource,
    atualizadoEm: Math.max(live.heartbeatAt || 0, creator.heartbeatAt || 0),
    origem: 'Shopee Live + Centro de Criação',
    ultimaLeituraSuspeita: live.leituraSuspeita ? 'live' : creator.leituraSuspeita ? 'creator' : null,
    coleta: 'Métricas oficiais por fonte; comentários reconhecidos pela API ou tela; entradas e intenções de compra são apenas avisos, nunca vendas.'
  };
}

export default async function handler(req, res) {
 for(let attempt=0;attempt<3;attempt++){
  try{return await handle(req,res);}catch(error){
   if(error?.code!=='V2J_CONFLICT'||attempt===2)return res.status(error?.code==='V2J_CONFLICT'?409:503).json({erro:error?.code==='V2J_CONFLICT'?'Sincronização simultânea: tente novamente.':'Retorno Shopee indisponível'});
  }
 }
}
async function handle(req,res){
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const cache = getCache({ namespace: NAMESPACE });
    const legacy = await cache.get('estado') || {};
    let active = await cache.get(ACTIVE_KEY);
    if (req.method === 'GET') {
      const generation = active?.generation || null;
      const [currentLive, currentCreator, currentChat] = await Promise.all([
        cache.get(sourceKey('live', generation)), cache.get(sourceKey('creator', generation)),
        cache.get(chatKey(generation))
      ]);
      const fallback = generation ? {} : legacy;
      return res.status(200).json({...buildResponse(
        currentLive || legacySource(fallback, 'live'),
        currentCreator || legacySource(fallback, 'creator'),
        normalizeChat(currentChat, fallback), fallback, active),storage:usesDatabase(NAMESPACE)?'neon':'runtime-cache'});
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !['live-shopee', 'creator-shopee'].includes(body.origem) ||
        !body.metricas || typeof body.metricas !== 'object' || Array.isArray(body.metricas)) {
      return res.status(400).json({ erro: 'Formato inválido' });
    }
    const source = body.origem === 'live-shopee' ? 'live' : 'creator';
    const now = Date.now();
    const incomingId = cleanText(body.sessaoId, 80);
    const observedAt = Number(body.sessaoObservadaEm);
    let novaLive = false;
    // Sala LIVE e Centro de Criação possuem IDs próprios. Os dois podem
    // identificar a sessão; não reiniciar quando uma fonte associa o seu ID pela 1ª vez.
    const isLiveId = source === 'live' && /^[A-Za-z0-9_-]{3,80}$/.test(incomingId);
    const isCreatorId = source === 'creator' && /^[0-9]{3,20}$/.test(incomingId);
    const oldObserved = Number(active?.observedAt) || 0;
    const olderRequest = active && Number.isFinite(observedAt) && observedAt > 0 &&
      oldObserved > observedAt + 1000;
    let changed = false;
    if (isLiveId) {
      changed = !active || (active.liveRoomId && active.liveRoomId !== incomingId) ||
        (!active.liveRoomId && !active.creatorRoomId && active.id !== incomingId);
    } else if (isCreatorId) {
      changed = !active ||
        (active.creatorRoomId && active.creatorRoomId !== incomingId) ||
        (!active.creatorRoomId && now - Number(active.lastSeenAt || active.createdAt || 0) > 120000);
    }
    if (changed && olderRequest) {
      return res.status(409).json({ erro: 'Requisição de uma LIVE anterior ignorada.', sessaoAnterior: true });
    }
    if (changed) {
      active = {
        id: isLiveId ? incomingId : 'creator-' + incomingId,
        generation: randomUUID().replace(/-/g, ''),
        liveRoomId: isLiveId ? incomingId : null,
        creatorRoomId: isCreatorId ? incomingId : null,
        observedAt: Number.isFinite(observedAt) && observedAt > 0 ? observedAt : now,
        createdAt: now, lastSeenAt: now
      };
      novaLive = true;
      await cache.set(ACTIVE_KEY, active, { ttl: TTL, name: 'Sessão Shopee atual' });
    } else if (active && (isLiveId || isCreatorId)) {
      const nextLiveId = isLiveId ? incomingId : active.liveRoomId;
      const nextCreatorId = isCreatorId ? incomingId : active.creatorRoomId;
      if (nextLiveId !== active.liveRoomId || nextCreatorId !== active.creatorRoomId ||
          now - Number(active.lastSeenAt || 0) > 30000) {
        active = {...active,liveRoomId:nextLiveId||null,creatorRoomId:nextCreatorId||null,lastSeenAt:now};
        await cache.set(ACTIVE_KEY, active, { ttl: TTL, name: 'Sessão Shopee atual' });
      }
    }
    const generation = active?.generation || null;
    const previous = await cache.get(sourceKey(source, generation)) ||
      legacySource(generation ? {} : legacy, source);
    const submitted = Object.fromEntries(FIELDS.map(field => [field, cleanValue(body.metricas[field])])
      .filter(([, value]) => value !== null));
    const values = Object.values(submitted);
    // Contador DOM pode mostrar zeros transitórios. A rota overview
    // fornece dados numéricos da resposta, não os algarismos animados.
    const trustedOverview = source === 'creator' && body.origemLeitura === 'overview_api' &&
      /^0\.8\.(?:16|2[4-9]|[3-9]\d)$/.test(body.versaoLeitor || '');
    const suspicious = !trustedOverview && values.length >= 8 && values.every(value =>
      Number(String(value).replace('R$', '').replace(',', '.').trim()) === 0);
    const camposAceitos = suspicious ? [] : Object.keys(submitted);
    const next = {
      ...previous, heartbeatAt: now, camposIdentificados: camposAceitos.length,
      leituraSuspeita: suspicious,
      metricas: { ...(previous.metricas || {}) }, campoEm: { ...(previous.campoEm || {}) }
    };
    if (camposAceitos.length) {
      for (const field of camposAceitos) {
        // Não apagar acumulados por zero de DOM nem diminuir pico observado.
        const old=countNumber(next.metricas[field]),value=countNumber(submitted[field]);
        if(['pcu','curtidas','compartilhamentos'].includes(field)&&old!==null&&value!==null&&((field==='pcu'&&value<old)||(!trustedOverview&&old>0&&value===0)))continue;
        if(source==='creator'&&!trustedOverview&&previous.origemLeitura==='overview_api'&&['vendas','ccu','pcu','visualizacoes','totalEspectadores','compradores','atc','pedidos','itensVendidos','pedidosConfirmados','pedidosPagos','tempoMedio','ctr','taxaCliquePedidos'].includes(field)&&previous.metricas?.[field]!==undefined)continue;
        next.metricas[field] = submitted[field];
        next.campoEm[field] = now;
      }
      next.lastValidAt = now;
    }
    if (source === 'live') {
      const diagnostico = parseDiagnostics(body.diagnostico);
      if (diagnostico) next.diagnosticoChat = diagnostico;
    } else {
      if (camposAceitos.length) next.origemLeitura = trustedOverview||previous.origemLeitura==='overview_api' ? 'overview_api' : 'dom';
      const diagnostico = cleanCreatorDiagnostics(body.diagnosticoCreator);
      if (diagnostico) next.diagnosticoCreator = diagnostico;
      if (typeof body.versaoLeitor === 'string' && /^0\.8\.\d{1,3}$/.test(body.versaoLeitor))
        next.versaoLeitor = body.versaoLeitor;
    }
    const produtos = cleanProducts(body.produtos);
    if (produtos && (produtos.length || !previous.produtos?.length)) { next.produtos = produtos;next.produtoEm = now; }
    const incomingExtras=source==='creator'?cleanExtras(body.extras):{};
    const incomingInsights=source==='live'?cleanLiveInsights(body.liveInsights):{};
    const insightsAceitos=Object.keys(incomingInsights);
    if(insightsAceitos.length){next.insights={...(previous.insights||{}),...incomingInsights};next.insightsAtualizadosEm={...(previous.insightsAtualizadosEm||{}),...Object.fromEntries(insightsAceitos.map(k=>[k,now]))};}
    if(incomingExtras.trends)next.historicoAudiencia=mergeTrends(previous.historicoAudiencia||previous.extras?.trends,incomingExtras.trends);
    if(incomingExtras.products&&previous.extras?.products?.total===incomingExtras.products.total){const old=previous.extras.products,p=incomingExtras.products;if(old.totalPaginas===p.totalPaginas){p.produtos=[...new Map([...old.produtos,...p.produtos].map(x=>[x.id||x.nome,x])).values()].slice(0,200);p.paginasObservadas=[...new Set([...old.paginasObservadas,...p.paginasObservadas])].sort((a,b)=>a-b);}}
    const extrasAceitos=Object.keys(incomingExtras);
    if(extrasAceitos.length){
     next.extras={...(previous.extras||{}),...incomingExtras};
      if(incomingExtras.violations){const old=previous.extras?.violations||{},v=incomingExtras.violations;next.extras.violations={...v,records:[...new Map([...(old.records||[]),...(v.records||[])].map(x=>[x.id,x])).values()].slice(-100),historicoAdvertencia:old.historicoAdvertencia===true||old.isWarned===true||v.isWarned===true||v.records.length>0,historicoEncerramento:old.historicoEncerramento===true||old.isTerminated===true||v.isTerminated===true};}
      if(incomingExtras.sessionInfo){const old=previous.extras?.sessionInfo||{},v=incomingExtras.sessionInfo;next.extras.sessionInfo={inicio:v.inicio||old.inicio||null,fim:v.fim||old.fim||null};}
     next.extrasAtualizadosEm={...(previous.extrasAtualizadosEm||{}),
      ...Object.fromEntries(extrasAceitos.map(x=>[x,now]))};
    }
    await cache.set(sourceKey(source, generation), next, { ttl: TTL, name: 'V2J Shopee ' + source });

    let fresh = [], confirmadosIds = [];
    if (source === 'live' && Array.isArray(body.eventos) && body.eventos.length) {
      const current = normalizeChat(await cache.get(chatKey(generation)), generation ? {} : legacy);
      const ids = new Set(current.idsRecentes);
      for (const event of body.eventos.slice(0, 40)) {
        const id = cleanText(event?.id, 80), autor = cleanText(event?.autor, 80), texto = cleanText(event?.texto, 400);
        if (!/^shopee-\d{1,12}$/.test(id) || !autor || !texto || /^bem-vind[oa]\s+(?:à|a|ao)\s+shopee/i.test(autor)) continue;
        confirmadosIds.push(id);
        if (ids.has(id)) continue;
        ids.add(id);
        const at=epoch(event?.recebidoEm);const eventTime=at&&at<=now+60000&&at>=now-86400000?at:now;
        const e={id,tipo:'comentario',autor,texto,hora:clock(eventTime),recebidoEm:eventTime};
        if([...current.comentariosLive,...fresh].some(x=>sameComment(x,e)))continue;
        fresh.push(e);
      }
      if (fresh.length) {
        await cache.set(chatKey(generation), {
          comentariosLive: [...current.comentariosLive, ...fresh].slice(-100),
          idsRecentes: [...ids].slice(-2000), ultimoComentarioEm: now,
          totalNovosComentarios: current.totalNovosComentarios + fresh.length
        }, { ttl: TTL, name: 'Chat Shopee V2J' });
      }
    }
    if(source==='creator'&&incomingExtras.comments?.comentarios?.length){
     const current=normalizeChat(await cache.get(chatKey(generation)),generation?{}:legacy);
     const ids=new Set(current.idsRecentes),items=[...current.comentariosLive];
     let added=0;
     for(const e of incomingExtras.comments.comentarios){
      const norm=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ');
      const signature=norm(e.autor)+'|'+norm(e.texto);
      const t=epoch(e.at)||now;const candidate={autor:e.autor,texto:e.texto,hora:clock(t),recebidoEm:t};
       if(items.some(item=>sameComment(item,candidate)))continue;
      const stableId='shopee-'+parseInt(createHash('sha256').update('creator:'+signature+':'+Math.floor(t/30000)).digest('hex').slice(0,9),16);
      if(ids.has(stableId))continue;
      ids.add(stableId);
      items.push({id:stableId,tipo:'comentario',autor:e.autor,texto:e.texto,
       hora:clock(t),recebidoEm:t});
      added++;
     }
     if(added)await cache.set(chatKey(generation),{
      comentariosLive:items.slice(-100),idsRecentes:[...ids].slice(-2000),
      ultimoComentarioEm:now,totalNovosComentarios:current.totalNovosComentarios+added
     },{ttl:TTL,name:'Chat Shopee V2J'});
    }
    return res.status(200).json({ ok: true, versaoRetorno: '0.8.35', storage:usesDatabase(NAMESPACE)?'neon':'runtime-cache', novaLive, sessaoIdentificada: !!active, camposAceitos, extrasAceitos, insightsAceitos,
      confirmadosIds, novosComentarios: fresh.length, leituraSuspeita: suspicious,
      produtosAceitos: produtos?.length ?? null, ultimaConfirmacaoEm: now });
  } catch (error) {
    if(error?.code==='V2J_CONFLICT')throw error;
    console.error('V2J Shopee: falha de sincronização:', error?.message || 'erro desconhecido');
    return res.status(500).json({ erro: 'Não foi possível processar o retorno da Shopee' });
  }
}
