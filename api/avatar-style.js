import {getCache} from '@vercel/functions';
const cache=getCache({namespace:'painel-avatar-visual-v1'});
const isRoom=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
function safeUrl(value){
 if(value==='')return true;
 if(typeof value!=='string'||value.length>1700)return false;
 try{
  const u=new URL(value);
  return u.protocol==='https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
   && /\.(png|jpeg|jpg|webp)$/i.test(u.pathname);
 }catch{return false}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store,private');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido'});
 let body={};
 try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch{return res.status(400).json({error:'Dados inválidos'})}
 const room=req.method==='GET'?req.query?.room:body.room;
 if(!isRoom(room))return res.status(400).json({error:'Sessão inválida'});
 try{
  if(req.method==='GET'){
   const x=await cache.get(room);
   return res.status(200).json({imageUrl:x?.imageUrl||''});
  }
  if(!safeUrl(body.imageUrl))return res.status(400).json({error:'Imagem deve vir do armazenamento público de avatar'});
  await cache.set(room,{imageUrl:body.imageUrl},{ttl:2592000,name:'Arte do astronauta'});
  return res.status(200).json({ok:true,imageUrl:body.imageUrl});
 }catch(e){
  console.error('Avatar visual:',e);
  return res.status(503).json({error:'Não foi possível salvar a arte'});
 }
}