import {getCache} from '@vercel/functions';

const initial={url:'',show:false,library:[],transition:'fade',duration:800,size:85,position:'center',command:0};
const allowedTransitions=new Set(['fade','slide','zoom','cut']);
const allowedPositions=new Set(['top','center','bottom']);
const isImageUrl=value=>{
 try{const url=new URL(value);return url.protocol==='https:'&&Boolean(url.hostname)&&value.length<=2000;}
 catch{return false;}
};
const between=(value,min,max,fallback)=>{
 const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};
function cleanLibrary(items){
 if(!Array.isArray(items))return [];
 const found=new Set(),list=[];
 for(const item of items){
  if(!item||typeof item.url!=='string')continue;
  const url=item.url.trim();
  if(!isImageUrl(url)||found.has(url))continue;
  found.add(url);
  const name=String(item.name||'Imagem').trim().slice(0,90)||'Imagem';
  list.push({url,name});
  if(list.length===60)break;
 }
 return list;
}
function normalize(v){
 const input=v&&typeof v==='object'?v:{};
 return {
  url:typeof input.url==='string'&&isImageUrl(input.url)?input.url:'',
  show:Boolean(input.show),
  library:cleanLibrary(input.library),
  transition:allowedTransitions.has(input.transition)?input.transition:initial.transition,
  duration:between(input.duration,150,2500,800),
  size:between(input.size,20,100,85),
  position:allowedPositions.has(input.position)?input.position:'center',
  command:Number(input.command)||0
 };
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const cache=getCache({namespace:'painel-cartas-v1'});
 let current;
 try{current=normalize((await cache.get('cartas'))||initial);}
 catch{return res.status(503).json({erro:'A biblioteca de imagens está indisponível'});}
 if(req.method==='GET')return res.status(200).json(current);
 if(req.method!=='PUT')return res.status(405).json({erro:'Método não permitido'});
 let body;
 try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}
 catch{return res.status(400).json({erro:'Dados inválidos'});}
 if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
 if(body.library!==undefined&&!Array.isArray(body.library))return res.status(400).json({erro:'Biblioteca inválida'});
 if(body.url!==undefined&&(typeof body.url!=='string'||(body.url&&!isImageUrl(body.url.trim()))))return res.status(400).json({erro:'Use uma URL HTTPS de imagem'});
 const next=normalize({...current,...body,command:Math.max(Date.now(),current.command+1)});
 if(!next.url)next.show=false;
 try{
  await cache.set('cartas',next,{ttl:2592000,name:'Imagens da live e transições'});
  return res.status(200).json(next);
 }catch{return res.status(503).json({erro:'Não foi possível sincronizar as imagens'});}
}
