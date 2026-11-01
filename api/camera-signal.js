import {getCache} from '@vercel/functions';

// Sinalização temporária para câmera WebRTC. O vídeo/áudio não são armazenados nesta API.
const cache=getCache({namespace:'painel-ao-vivo-camera-signal-v1'});
const TTL=240;
const validChannel=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(v);
const validSession=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
const parseBody=req=>typeof req.body==='string'?JSON.parse(req.body):req.body||{};
const validDescription=(v,type)=>v?.type===type&&typeof v.sdp==='string'&&v.sdp.length>=20&&v.sdp.length<=64000;

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({erro:'Método não permitido'});
 let body={};
 if(req.method==='POST'){try{body=parseBody(req);}catch{return res.status(400).json({erro:'JSON inválido'});}}
 const channel=req.method==='GET'?req.query?.channel:body.channel;
 if(!validChannel(channel))return res.status(400).json({erro:'Canal inválido'});
 const offerKey='offer:'+channel,answerKey='answer:'+channel;
 try{
  if(req.method==='GET'){
   const side=req.query?.side;
   if(side==='receiver')return res.status(200).json({offer:(await cache.get(offerKey))||null});
   if(side==='sender')return res.status(200).json({answer:(await cache.get(answerKey))||null});
   return res.status(400).json({erro:'Papel inválido'});
  }
  if(!validSession(body.session))return res.status(400).json({erro:'Sessão inválida'});
  if(body.action==='offer'||body.action==='heartbeat'){
   if(!validDescription(body.description,'offer'))return res.status(400).json({erro:'Oferta inválida'});
   await cache.set(offerKey,{session:body.session,description:body.description},{ttl:TTL,name:'Câmera: oferta WebRTC'});
   if(body.action==='offer')await cache.delete(answerKey);
   return res.status(200).json({ok:true});
  }
  if(body.action==='answer'){
   if(!validDescription(body.description,'answer'))return res.status(400).json({erro:'Resposta inválida'});
   const offer=await cache.get(offerKey);
   if(!offer||offer.session!==body.session)return res.status(409).json({erro:'Transmissão não está ativa'});
   await cache.set(answerKey,{session:body.session,description:body.description},{ttl:TTL,name:'Câmera: resposta WebRTC'});
   return res.status(200).json({ok:true});
  }
  if(body.action==='stop'){
   const offer=await cache.get(offerKey);
   if(offer?.session===body.session){
    await cache.delete(offerKey);await cache.delete(answerKey);
   }
   return res.status(200).json({ok:true});
  }
  return res.status(400).json({erro:'Ação inválida'});
 }catch(e){
  console.error('Sinalização de câmera indisponível',e);
  return res.status(503).json({erro:'Sinalização indisponível no momento'});
 }
}