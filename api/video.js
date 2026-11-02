import {getCache} from '@vercel/functions';

// Uma única saída de vídeo, preservada no endereço original /video-obs.html.
// Duas playlists são apenas pastas de organização, não transmissores separados.
const cache=getCache({namespace:'painel-video-v1'});
const initial={
 url:'',playing:false,loop:true,muted:true,command:0,library:[],
 transition:'fade',duration:850,mode:'single',playlistChannel:'tiktok',
 playlistLoop:true,playlistLoops:{tiktok:true,youtube:true}
};
const isHttps=url=>{try{const u=new URL(url);return u.protocol==='https:'&&Boolean(u.hostname);}catch{return false;}};
const groupOf=item=>item?.channel==='youtube'?'youtube':'tiktok';
const safeLoop=v=>v!==false;
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
  out.push({url,name,channel:groupOf(item)});
  if(out.length>=40)break;
 }
 return out;
}
function normalize(value){
 const v=value||{};
 const playlistChannel=v.playlistChannel==='youtube'?'youtube':'tiktok';
 const oldLoop=safeLoop(v.playlistLoop);
 const playlistLoops={
  tiktok:safeLoop(v.playlistLoops?.tiktok===undefined?oldLoop:v.playlistLoops.tiktok),
  youtube:safeLoop(v.playlistLoops?.youtube===undefined?true:v.playlistLoops.youtube)
 };
 return {...initial,...v,
  library:cleanLibrary(v.library),mode:v.mode==='playlist'?'playlist':'single',
  playlistChannel,playlistLoops,playlistLoop:playlistLoops[playlistChannel],
  playing:!!v.playing,loop:safeLoop(v.loop),muted:safeLoop(v.muted),
  transition:['fade','black','cut'].includes(v.transition)?v.transition:'fade',
  duration:Math.max(300,Math.min(2500,Number(v.duration)||850)),
  command:Number.isFinite(Number(v.command))?Number(v.command):0
 };
}
const nextCommand=state=>Math.max(Date.now(),Number(state.command||0)+1);
const parse=req=>typeof req.body==='string'?JSON.parse(req.body):req.body||{};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','PUT','POST'].includes(req.method))return res.status(405).json({erro:'Método não permitido'});
 try{
  const current=normalize((await cache.get('video'))||initial);
  // Antigos pedidos com ?channel=youtube também usam a ÚNICA saída agora.
  if(req.method==='GET')return res.status(200).json(current);
  let b;
  try{b=parse(req);}catch{return res.status(400).json({erro:'Dados inválidos'});}
  if(!b||typeof b!=='object'||Array.isArray(b))return res.status(400).json({erro:'Dados inválidos'});
  if(req.method==='POST'){
   if(b.action!=='ended')return res.status(400).json({erro:'Ação inválida'});
   if(current.mode!=='playlist'||!current.playing||
      b.command!==current.command||b.url!==current.url){
    return res.status(200).json({ok:true,ignored:true,...current});
   }
   const items=current.library.filter(item=>item.channel===current.playlistChannel);
   if(!items.length){
    const result={...current,url:'',playing:false,mode:'single',command:nextCommand(current)};
    await cache.set('video',result,{ttl:2592000,name:'Biblioteca e playlist única da LIVE'});
    return res.status(200).json({ok:true,...result});
   }
   const index=items.findIndex(item=>item.url===current.url);
   const isLast=index>=items.length-1;
   const next=isLast?(current.playlistLoop?items[0]:null):items[index+1];
   const result={...current,url:next?.url||current.url,playing:!!next,command:nextCommand(current)};
   await cache.set('video',result,{ttl:2592000,name:'Biblioteca e playlist única da LIVE'});
   return res.status(200).json({ok:true,...result});
  }
  const url=b.url===undefined?current.url:b.url;
  if(typeof url!=='string'||url.length>2000||(url&&!isHttps(url)))return res.status(400).json({erro:'Use um endereço HTTPS de MP4/WebM'});
  if(b.library!==undefined&&!Array.isArray(b.library))return res.status(400).json({erro:'Lista de vídeos inválida'});
  if(b.mode!==undefined&&!['single','playlist'].includes(b.mode))return res.status(400).json({erro:'Modo inválido'});
  if(b.playlistChannel!==undefined&&!['tiktok','youtube'].includes(b.playlistChannel))return res.status(400).json({erro:'Lista inválida'});
  const transition=b.transition===undefined?current.transition:b.transition;
  if(!['fade','black','cut'].includes(transition))return res.status(400).json({erro:'Transição inválida'});
  const playlistChannel=b.playlistChannel===undefined?current.playlistChannel:b.playlistChannel;
  let playlistLoops={...current.playlistLoops};
  if(b.playlistLoops!==undefined){
   if(!b.playlistLoops||typeof b.playlistLoops!=='object'||Array.isArray(b.playlistLoops))return res.status(400).json({erro:'Repetição inválida'});
   for(const channel of ['tiktok','youtube']){
    if(b.playlistLoops[channel]!==undefined){
     if(typeof b.playlistLoops[channel]!=='boolean')return res.status(400).json({erro:'Repetição inválida'});
     playlistLoops[channel]=b.playlistLoops[channel];
    }
   }
  }else if(b.playlistLoop!==undefined){
   // Compatibilidade com controladores anteriores que ajustavam apenas o loop atual.
   playlistLoops[playlistChannel]=!!b.playlistLoop;
  }
  const result={
   ...current,url,playing:Boolean(url)&&(b.playing===undefined?current.playing:!!b.playing),
   mode:b.mode===undefined?current.mode:b.mode,
   playlistChannel,playlistLoops,playlistLoop:playlistLoops[playlistChannel],
   loop:b.loop===undefined?current.loop:!!b.loop,muted:b.muted===undefined?current.muted:!!b.muted,
   library:b.library===undefined?current.library:cleanLibrary(b.library),
   transition,duration:b.duration===undefined?current.duration:Math.max(300,Math.min(2500,Number(b.duration)||850)),
   command:nextCommand(current)
  };
  await cache.set('video',result,{ttl:2592000,name:'Biblioteca e playlist única da LIVE'});
  return res.status(200).json({ok:true,...result});
 }catch(error){
  console.error('Falha no vídeo único',error);
  return res.status(503).json({erro:'Controle de vídeo temporariamente indisponível'});
 }
}
