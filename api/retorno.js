import {getCache} from '@vercel/functions';
const validMode = mode => ['texto','tela','central'].includes(mode) ? mode : 'texto';

const defaultCentral={produto:{nome:'',descricao:'',preco:'',imagens:[]},recado:'',chat:[],versao:0};
const trim=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
function cleanCentral(input){
 const p=input?.produto||{};
 return {produto:{nome:trim(p.nome,160),descricao:trim(p.descricao,5000),preco:trim(p.preco,80),
 imagens:(Array.isArray(p.imagens)?p.imagens:[]).slice(0,6).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<=2000)},
 recado:trim(input?.recado,1200),
 chat:(Array.isArray(input?.chat)?input.chat:[]).slice(-40).map(m=>({id:trim(m?.id,90),autor:trim(m?.autor,80),texto:trim(m?.texto,400),hora:trim(m?.hora,12)})).filter(m=>m.texto),
 versao:Number(input?.versao)||0};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET' && req.method!=='PUT'){
  res.setHeader('Allow','GET, PUT'); return res.status(405).json({erro:'Método inválido'});
 }
 try{
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
