import {getCache} from '@vercel/functions';
const validMode = mode => ['texto','tela','central'].includes(mode) ? mode : 'texto';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET' && req.method!=='PUT'){
  res.setHeader('Allow','GET, PUT'); return res.status(405).json({erro:'Método inválido'});
 }
 try{
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
