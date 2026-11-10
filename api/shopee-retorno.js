import {getCache} from '@vercel/functions';

const fields=['vendas','usuariosEngajados','comentarios','atc','visualizacoes','tempoMedio','conversoes','gpm','pedidos','ads','ccu','pcu','ctr','taxaCliquePedidos','compradores','itensVendidos'];
const cleanText=(v,n=100)=>typeof v==='string'?v.trim().slice(0,n):'';
const cleanValue=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:typeof v==='string'&&/^(?:(?:R\$\s*)?[\d.,]+\s*%?|\d{2}:\d{2}:\d{2})$/.test(v.trim())?v.trim().slice(0,40):null;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','PUT'].includes(req.method))return res.status(405).json({erro:'Método não permitido'});
 try{
  const cache=getCache({namespace:'v2j-shopee-retorno-v1'});
  if(req.method==='GET')return res.status(200).json(await cache.get('estado')||{metricas:{},produtos:[],atualizadoEm:0,origem:'aguardando'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||!['creator-shopee','live-shopee'].includes(body.origem) || !body.metricas || typeof body.metricas!=='object'||Array.isArray(body.metricas))return res.status(400).json({erro:'Formato inválido'});
  const current=await cache.get('estado')||{metricas:{},produtos:[],atualizadoEm:0};
  // Um único campo consolidado por indicador. Valores do Creator (dados oficiais
  // agregados) prevalecem sobre os da sala LIVE; jamais somar contagens.
  const fontes={
   live:{...(current.fontes?.live||{})},
   creator:{...(current.fontes?.creator||(current.origem==='Centro de Criação Shopee'?current.metricas:{}))}
  };
  const target=body.origem==='creator-shopee'?'creator':'live';
  let changed=false;
  for(const field of fields){const value=cleanValue(body.metricas[field]);if(value!==null&&value!==fontes[target][field]){fontes[target][field]=value;changed=true;}}
  const metricas={...fontes.live,...fontes.creator};
  const produtos=Array.isArray(body.produtos)?body.produtos.slice(0,80).map(p=>({
   nome:cleanText(p?.nome,180),cliques:cleanValue(p?.cliques),ctr:cleanValue(p?.ctr),pedidos:cleanValue(p?.pedidos),vendas:cleanValue(p?.vendas),atc:cleanValue(p?.atc)
  })).filter(p=>p.nome):current.produtos;
  if(!changed&&JSON.stringify(produtos)===JSON.stringify(current.produtos))return res.status(200).json({ok:true,alterado:false});
  const next={metricas,produtos,fontes,atualizadoEm:Date.now(),origem:'Shopee Live + Centro de Criação',coleta:'campos visíveis nas duas páginas; fonte Creator prioritária; sem somar duplicados'};
  await cache.set('estado',next,{ttl:2592000,name:'Retorno Shopee V2J'});
  return res.status(200).json({ok:true,alterado:true});
 }catch{return res.status(500).json({erro:'Não foi possível processar o retorno da Shopee'});}
}
