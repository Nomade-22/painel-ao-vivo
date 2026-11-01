import {getCache} from '@vercel/functions';

const initial={cameraId:'',enabled:false,audio:false,command:0};
const valid=id=>typeof id==='string'&&(!id||/^[a-zA-Z0-9_-]{16,64}$/.test(id));
const normalize=value=>({
 cameraId:valid(value?.cameraId)?value.cameraId:'',
 enabled:!!value?.enabled&&valid(value?.cameraId)&&!!value.cameraId,
 audio:!!value?.audio,
 command:Number.isFinite(value?.command)?value.command:0
});
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'&&req.method!=='PUT')return res.status(405).json({erro:'Método não permitido'});
 const cache=getCache({namespace:'painel-camera-v1'});
 try{
  let current=await cache.get('camera');
  if(!current){
   // Migração opcional: aproveita o link da câmera configurado antes da separação.
   let old;
   try{old=await getCache({namespace:'painel-video-v1'}).get('video');}catch{}
   current=normalize({cameraId:old?.cameraId||'',enabled:false,audio:old?.cameraAudio||false});
   if(current.cameraId)await cache.set('camera',current,{ttl:2592000,name:'Câmera remota independente'});
  }
  current=normalize(current||initial);
  if(req.method==='GET')return res.status(200).json(current);
  let body;
  try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return res.status(400).json({erro:'JSON inválido'});}
  if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
  const cameraId=body.cameraId===undefined?current.cameraId:body.cameraId;
  if(!valid(cameraId))return res.status(400).json({erro:'Identificador da câmera inválido'});
  const enabled=body.enabled===undefined?current.enabled:body.enabled===true;
  if(enabled&&!cameraId)return res.status(400).json({erro:'Gere o link da câmera primeiro'});
  const data={cameraId,enabled:enabled&&!!cameraId,
    audio:body.audio===undefined?current.audio:body.audio===true,
    command:Math.max(Date.now(),Number(current.command||0)+1)};
  await cache.set('camera',data,{ttl:2592000,name:'Câmera remota independente'});
  return res.status(200).json({ok:true,...data});
 }catch(e){
  console.error('Falha no controle de câmera',e);
  return res.status(503).json({erro:'Câmera temporariamente indisponível'});
 }
}
