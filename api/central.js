import {getCache} from '@vercel/functions';
const blank={produto:{nome:'',descricao:'',preco:'',imagens:[]},recado:'',chat:[],versao:0};
const txt=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const image=v=>typeof v==='string'&&/^https:\/\//i.test(v)&&v.length<=2000?v:'';
function normalize(input){
 const p=input?.produto||{};
 return {
  produto:{nome:txt(p.nome,160),descricao:txt(p.descricao,5000),preco:txt(p.preco,80),imagens:(Array.isArray(p.imagens)?p.imagens:[]).slice(0,6).map(image).filter(Boolean)},
  recado:txt(input?.recado,1200),
  chat:(Array.isArray(input?.chat)?input.chat:[]).slice(-40).map(m=>({id:txt(m?.id,90),autor:txt(m?.autor,80),texto:txt(m?.texto,400),hora:txt(m?.hora,12)})).filter(m=>m.texto),
  versao:Number(input?.versao)||0
 };
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','PUT'].includes(req.method)){res.setHeader('Allow','GET, PUT');return res.status(405).json({erro:'Método inválido'});}
 try{
  const cache=getCache({namespace:'central-retorno-v1'});
  if(req.method==='GET')return res.status(200).json(normalize(await cache.get('estado')||blank));
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
  const data=normalize({...body,versao:Date.now()});
  await cache.set('estado',data,{ttl:2592000,name:'Central de retorno da live'});
  return res.status(200).json({ok:true,versao:data.versao});
 }catch(e){console.error('Central de retorno',e);return res.status(503).json({erro:'Central temporariamente indisponível'});}
}
