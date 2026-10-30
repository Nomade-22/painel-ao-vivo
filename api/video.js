import {getCache} from '@vercel/functions';
const initial={url:'',playing:false,loop:true,muted:true,command:0};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const cache=getCache({namespace:'painel-video-v1'});
 if(req.method==='GET'){
  try{return res.status(200).json((await cache.get('video'))||initial);}
  catch(e){return res.status(503).json({erro:'Video indisponivel'});}
 }
 if(req.method!=='PUT')return res.status(405).json({erro:'Metodo nao permitido'});
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 if(typeof b.url!=='string'||b.url.length>2000||(b.url&&!/^https:\/\//i.test(b.url)))return res.status(400).json({erro:'Use URL HTTPS de arquivo MP4 ou WebM'});
 const data={url:b.url,playing:!!b.playing,loop:!!b.loop,muted:!!b.muted,command:Date.now()};
 try{await cache.set('video',data,{ttl:86400,name:'Video do painel'});return res.status(200).json({ok:true,...data});}
 catch(e){return res.status(503).json({erro:'Nao foi possivel salvar'});}
}