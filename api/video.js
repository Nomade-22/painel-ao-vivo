import {getCache} from '@vercel/functions';

const initial={url:'',playing:false,loop:true,muted:true,command:0,library:[],transition:'fade',duration:850,mode:'video',cameraId:'',cameraAudio:false};
const isHttps=url=>{try{const u=new URL(url);return u.protocol==='https:' && Boolean(u.hostname);}catch{return false;}};
function cleanLibrary(items){
 if(!Array.isArray(items))return [];
 const seen=new Set(),result=[];
 for(const item of items){
  if(!item || typeof item.url!=='string')continue;
  const url=item.url.trim();
  if(url.length>2000 || !isHttps(url) || seen.has(url))continue;
  seen.add(url);
  const fallback=(()=>{try{return decodeURIComponent(new URL(url).pathname.split('/').pop()||'Vídeo')}catch{return 'Vídeo'}})();
  const name=String(item.name||fallback).trim().slice(0,90)||'Vídeo';
  result.push({url,name});
  if(result.length>=40)break;
 }
 return result;
}
function normalize(v){
 return {
  ...initial,...v,
  library:cleanLibrary(v?.library),
  transition:['fade','black','cut'].includes(v?.transition)?v.transition:'fade',
  duration:Math.max(300,Math.min(2500,Number(v?.duration)||850)),
  mode:v?.mode==='camera'&&/^[a-zA-Z0-9_-]{16,64}$/.test(v?.cameraId||'')?'camera':'video',
  cameraId:/^[a-zA-Z0-9_-]{16,64}$/.test(v?.cameraId||'')?v.cameraId:'',
  cameraAudio:!!v?.cameraAudio
 };
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const cache=getCache({namespace:'painel-video-v1'});
 let current;
 try{current=normalize((await cache.get('video'))||initial);}
 catch(e){return res.status(503).json({erro:'Vídeo indisponível no momento'});}
 if(req.method==='GET')return res.status(200).json(current);
 if(req.method!=='PUT')return res.status(405).json({erro:'Método não permitido'});
 let b;
 try{b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}
 catch{return res.status(400).json({erro:'Dados inválidos'});}
 if(typeof b!=='object'||b===null||Array.isArray(b))return res.status(400).json({erro:'Dados inválidos'});
 const url=b.url===undefined?current.url:b.url;
 if(typeof url!=='string'||url.length>2000||(url&&!isHttps(url)))return res.status(400).json({erro:'Use uma URL HTTPS de arquivo MP4/WebM'});
 if(b.library!==undefined && !Array.isArray(b.library))return res.status(400).json({erro:'Lista de vídeos inválida'});
 const cameraId=b.cameraId===undefined?current.cameraId:b.cameraId;
 if(typeof cameraId!=='string'||(cameraId&&!/^[a-zA-Z0-9_-]{16,64}$/.test(cameraId)))return res.status(400).json({erro:'Identificador de câmera inválido'});
 const mode=b.mode===undefined?current.mode:b.mode;
 if(!['video','camera'].includes(mode))return res.status(400).json({erro:'Modo de reprodução inválido'});
 if(mode==='camera'&&!cameraId)return res.status(400).json({erro:'Gere o link da câmera primeiro'});
 const data={
  url,
  playing:Boolean(url)&&(b.playing===undefined?current.playing:!!b.playing),
  loop:b.loop===undefined?current.loop:!!b.loop,
  muted:b.muted===undefined?current.muted:!!b.muted,
  library:b.library===undefined?current.library:cleanLibrary(b.library),
  transition:['fade','black','cut'].includes(b.transition)?b.transition:current.transition,
  duration:b.duration===undefined?current.duration:Math.max(300,Math.min(2500,Number(b.duration)||850)),
  mode,
  cameraId,
  cameraAudio:b.cameraAudio===undefined?current.cameraAudio:!!b.cameraAudio,
  command:Math.max(Date.now(),Number(current.command||0)+1)
 };
 try{
  await cache.set('video',data,{ttl:2592000,name:'Biblioteca e controle da live'});
  return res.status(200).json({ok:true,...data});
 }catch(e){return res.status(503).json({erro:'Não foi possível salvar o controle de vídeo'});}
}
