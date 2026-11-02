import {getCache} from '@vercel/functions';

// TikTok conserva o namespace original para não apagar vídeos e comandos existentes.
// YouTube usa estado independente; a biblioteca é compartilhada, com destino por vídeo.
const initial={url:'',playing:false,loop:true,muted:true,command:0,library:[],transition:'fade',duration:850,mode:'single',playlistLoop:true};
const sharedCache=getCache({namespace:'painel-video-v1'});
const youtubeCache=getCache({namespace:'painel-video-youtube-v1'});
const isHttps=url=>{try{const u=new URL(url);return u.protocol==='https:'&&Boolean(u.hostname);}catch{return false;}};
const channelOf=item=>item?.channel==='youtube'?'youtube':'tiktok'; // migração: vídeos antigos ficam no TikTok
function cleanLibrary(items){
 if(!Array.isArray(items))return [];
 const seen=new Set(),out=[];
 for(const item of items){
  if(!item||typeof item.url!=='string')continue;
  const url=item.url.trim();
  if(url.length>2000||!isHttps(url)||seen.has(url))continue;
  seen.add(url);
  const fallback=(()=>{try{return decodeURIComponent(new URL(url).pathname.split('/').pop()||'Vídeo');}catch{return 'Vídeo';}})();
  const name=String(item.name||fallback).trim().slice(0,90)||'Vídeo';
  out.push({url,name,channel:channelOf(item)});
  if(out.length>=40)break;
 }
 return out;
}
function normalize(value){
 const v=value||{};
 return {...initial,...v,
  library:cleanLibrary(v.library),
  mode:v.mode==='playlist'?'playlist':'single',
  playlistLoop:v.playlistLoop!==false,
  loop:v.loop!==false,muted:v.muted!==false,playing:!!v.playing,
  transition:['fade','black','cut'].includes(v.transition)?v.transition:'fade',
  duration:Math.max(300,Math.min(2500,Number(v.duration)||850)),
  command:Number.isFinite(Number(v.command))?Number(v.command):0
 };
}
function nextCommand(old){return Math.max(Date.now(),Number(old.command||0)+1);}
const parse=req=>typeof req.body==='string'?JSON.parse(req.body):req.body||{};
async function read(cache){return normalize((await cache.get('video'))||initial);}
async function write(cache,data){await cache.set('video',data,{ttl:2592000,name:'Controle de vídeo e playlists da LIVE'});}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const channel=req.query?.channel==='youtube'?'youtube':'tiktok';
 const cache=channel==='youtube'?youtubeCache:sharedCache;
 if(!['GET','PUT','POST'].includes(req.method))return res.status(405).json({erro:'Método não permitido'});
 try{
  const current=await read(cache);
  const shared=channel==='youtube'?await read(sharedCache):current;
  if(req.method==='GET')return res.status(200).json({...current,library:shared.library});
  let b;
  try{b=parse(req);}catch{return res.status(400).json({erro:'Dados inválidos'});}
  if(!b||typeof b!=='object'||Array.isArray(b))return res.status(400).json({erro:'Dados inválidos'});
  if(req.method==='POST'){
   if(b.action!=='ended')return res.status(400).json({erro:'Ação inválida'});
   // Evita que espectadores ou prévias avancem a fila mais de uma vez.
   if(current.mode!=='playlist'||!current.playing||
      b.command!==current.command||b.url!==current.url){
    return res.status(200).json({ok:true,ignored:true,...current,library:shared.library});
   }
   const list=shared.library.filter(item=>item.channel===channel);
   if(!list.length){
    const updated={...current,url:'',playing:false,mode:'single',command:nextCommand(current)};
    await write(cache,updated);
    return res.status(200).json({ok:true,...updated,library:shared.library});
   }
   const index=list.findIndex(item=>item.url===current.url);
   const last=index>=list.length-1;
   const next=last&&current.playlistLoop?list[0]:last?null:list[index+1];
   const updated={
    ...current,
    url:next?.url||current.url,
    playing:!!next,command:nextCommand(current)
   };
   await write(cache,updated);
   return res.status(200).json({ok:true,...updated,library:shared.library});
  }
  const url=b.url===undefined?current.url:b.url;
  if(typeof url!=='string'||url.length>2000||(url&&!isHttps(url))){
   return res.status(400).json({erro:'Use um endereço HTTPS direto de MP4/WebM'});
  }
  if(b.library!==undefined&&!Array.isArray(b.library))return res.status(400).json({erro:'Lista de vídeos inválida'});
  if(b.mode!==undefined&&!['single','playlist'].includes(b.mode))return res.status(400).json({erro:'Modo de reprodução inválido'});
  const transition=b.transition===undefined?current.transition:b.transition;
  if(!['fade','black','cut'].includes(transition))return res.status(400).json({erro:'Transição inválida'});
  // Somente o canal TikTok pode modificar a biblioteca compartilhada.
  const library=channel==='tiktok'&&b.library!==undefined?cleanLibrary(b.library):shared.library;
  const updated={
   ...current,url,
   playing:Boolean(url)&&(b.playing===undefined?current.playing:!!b.playing),
   loop:b.loop===undefined?current.loop:!!b.loop,
   muted:b.muted===undefined?current.muted:!!b.muted,
   mode:b.mode===undefined?current.mode:b.mode,
   playlistLoop:b.playlistLoop===undefined?current.playlistLoop:!!b.playlistLoop,
   transition,
   duration:b.duration===undefined?current.duration:Math.max(300,Math.min(2500,Number(b.duration)||850)),
   library:channel==='tiktok'?library:[],
   command:nextCommand(current)
  };
  await write(cache,updated);
  return res.status(200).json({ok:true,...updated,library});
 }catch(err){
  console.error('Falha em /api/video:',err);
  return res.status(503).json({erro:'Controle de vídeos temporariamente indisponível'});
 }
}
