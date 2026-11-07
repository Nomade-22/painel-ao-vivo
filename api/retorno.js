import {getCache} from '@vercel/functions';
const validMode = mode => ['texto','tela','central'].includes(mode) ? mode : 'texto';

const defaultCentral={produto:{nome:'',descricao:'',preco:'',imagens:[]},recado:'',chat:[],catalogo:[],itemAtivo:0,fichaCapturada:null,versao:0};
const trim=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
function cleanCentral(input){
 const p=input?.produto||{};
 return {produto:{nome:trim(p.nome,160),descricao:trim(p.descricao,5000),preco:trim(p.preco,80),link:typeof p.link==='string'&&/^https:\/\/shop\.tiktok\.com\/view\/product\/\d+/i.test(p.link)?p.link.slice(0,500):'',
 imagens:(Array.isArray(p.imagens)?p.imagens:[]).slice(0,6).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<=2000)},
 recado:trim(input?.recado,1200),
 chat:(Array.isArray(input?.chat)?input.chat:[]).slice(-40).map(m=>({id:trim(m?.id,90),autor:trim(m?.autor,80),texto:trim(m?.texto,400),hora:trim(m?.hora,12)})).filter(m=>m.texto),
 catalogo:(Array.isArray(input?.catalogo)?input.catalogo:[]).slice(0,200).map(p=>({
 numero:Math.max(1,Math.min(999,Math.floor(Number(p?.numero)||0))),
 nome:trim(p?.nome,180),preco:trim(p?.preco,80),descricao:trim(p?.descricao,3000),
 link:typeof p?.link==='string'&&/^https:\/\/shop\.tiktok\.com\/view\/product\/\d+/i.test(p.link)?p.link.slice(0,500):'',
 imagem:typeof p?.imagem==='string'&&/^https:\/\//i.test(p.imagem)&&p.imagem.length<=2000?p.imagem:'',
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
 versao:Number(input?.versao)||0};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET' && req.method!=='PUT'){
  res.setHeader('Allow','GET, PUT'); return res.status(405).json({erro:'Método inválido'});
 }
 try{
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
   const images=(Array.isArray(payload?.imagens)?payload.imagens:[]).slice(0,12).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<=2000);
   const catalogo=current.catalogo.map(item=>{
    if(!item.link.includes('/view/product/'+match[1]))return item;
    const currentImages=Array.isArray(item.imagens)?item.imagens:[];
    const mergedImages=item.origem==='manual'&&currentImages.length?currentImages:[...new Set([...currentImages,...images])].slice(0,12);
    const description=item.origem==='manual'&&item.descricao?item.descricao:
      (fichaCapturada.descricao.length>(item.descricao||'').length?fichaCapturada.descricao:item.descricao);
    return {...item,descricao:description,imagens:mergedImages,
      imagem:item.imagem||fichaCapturada.imagem};
   });
   const next={...current,catalogo,fichaCapturada,versao:Date.now()};
   await cacheCapture.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,id:match[1]});
  }
  if(req.query?.sync==='1'){
   if(req.method!=='PUT')return res.status(405).json({erro:'Método inválido'});
   const payload=typeof req.body==='string'?JSON.parse(req.body):req.body;
   const incoming=Array.isArray(payload?.items)?payload.items:[];
   if(incoming.length>200)return res.status(400).json({erro:'Muitos itens'});
   const cacheSync=getCache({namespace:'central-retorno-v1'});
   const current=cleanCentral(await cacheSync.get('estado')||defaultCentral);
   const manual=new Map(current.catalogo.filter(p=>p.origem==='manual').map(p=>[p.numero,p]));
   const imported=cleanCentral({catalogo:incoming.map(p=>({...p,origem:'tiktok'}))}).catalogo;
   const mergedMap=new Map(current.catalogo.map(p=>[p.numero,p]));
   for(const p of imported)if(!manual.has(p.numero))mergedMap.set(p.numero,p);
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
   const next={...current,catalogo:merged.slice(0,200),versao:Date.now()};
   await cacheSync.set('estado',next,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,recebidos:imported.length,armazenados:next.catalogo.length});
  }
  if(req.query?.central==='1'){
   const centralCache=getCache({namespace:'central-retorno-v1'});
   if(req.method==='GET')return res.status(200).json(cleanCentral(await centralCache.get('estado')||defaultCentral));
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
   const data=cleanCentral({...body,versao:Date.now()});
   await centralCache.set('estado',data,{ttl:2592000,name:'Central de retorno da live'});
   return res.status(200).json({ok:true,versao:data.versao});
  }
  const cache=getCache({namespace:'painel-retorno-v1'});
  if(req.method==='GET'){
   const state=await cache.get('modo');
   return res.status(200).json({modo:validMode(state?.modo),versao:state?.versao||0});
  }
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body || !['texto','tela','central'].includes(body.modo))return res.status(400).json({erro:'Modo inválido'});
  const state={modo:body.modo,versao:Date.now()};
  await cache.set('modo',state,{ttl:2592000,name:'Modo do retorno OBS'});
  return res.status(200).json({ok:true,...state});
 }catch(e){console.error('Retorno OBS',e);return res.status(503).json({erro:'Controle de retorno indisponível'});}
}
