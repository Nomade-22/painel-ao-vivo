import {getCache} from '@vercel/functions';

// Experimento isolado: somente coordenadas corporais, NUNCA frames de câmera.
// Room é um token aleatório; compartilhe o link da fonte somente com quem controla a live.
const cache=getCache({namespace:'painel-avatar-pose-v1'});
const visualCache=getCache({namespace:'painel-avatar-visual-v1'});
const safeImageUrl=url=>{
 if(url==='')return true;
 if(typeof url!=='string'||url.length>1700)return false;
 try{const u=new URL(url);
  return u.protocol==='https:'&&u.hostname.endsWith('.public.blob.vercel-storage.com')&&/\.(png|jpeg|jpg|webp)$/i.test(u.pathname);
 }catch{return false;}
};
const keyPattern=/^[a-f0-9]{32}$/;
const joints=['nose','leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','leftHip','rightHip'];
const extraJoints=['leftEar','rightEar','leftIndex','rightIndex'];
const validPoint=p=>Array.isArray(p)&&p.length===3&&p.every(n=>typeof n==='number'&&Number.isFinite(n))&&p[0]>=0&&p[0]<=1&&p[1]>=0&&p[1]<=1&&p[2]>=0&&p[2]<=1;
const parse=req=>typeof req.body==='string'?JSON.parse(req.body):req.body||{};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store,private');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método inválido'});
 try{
  const body=req.method==='POST'?parse(req):{};
  const room=String((req.method==='GET'?req.query?.room:body?.room)||'');
  if(!keyPattern.test(room))return res.status(400).json({error:'Sessão inválida'});
  if(req.method==='GET'&&req.query?.view==='style'){
   const saved=await visualCache.get(room);
   return res.status(200).json({imageUrl:saved?.imageUrl||''});
  }
  if(req.method==='POST'&&body.action==='style'){
   if(!safeImageUrl(body.imageUrl))return res.status(400).json({error:'Imagem inválida'});
   await visualCache.set(room,{imageUrl:body.imageUrl},{ttl:2592000,name:'Arte do astronauta'});
   return res.status(200).json({ok:true,imageUrl:body.imageUrl});
  }
  if(req.method==='GET'){
   const data=await cache.get(room);
   if(!data||Date.now()-Number(data.ts)>8000)
    return res.status(200).json({active:false,ts:0,points:null});
   return res.status(200).json(data);
  }
  if(body.active===false){
   await cache.set(room,{active:false,ts:Date.now(),points:null},{ttl:65,name:'Avatar desligado'});
   return res.status(200).json({ok:true});
  }
  if(body.active!==true||!body.points||typeof body.points!=='object'||Array.isArray(body.points))
   return res.status(400).json({error:'Pontos inválidos'});
  const points={};
  for(const name of joints){
   const p=body.points[name];
   if(!validPoint(p))return res.status(400).json({error:'Ponto corporal inválido'});
   points[name]=p.map(n=>Math.round(n*10000)/10000);
  }
  // Compatibilidade com celulares que usam a captura antiga de 9 pontos.
  for(const name of extraJoints){
   const p=body.points[name];
   if(p===undefined)continue;
   if(!validPoint(p))return res.status(400).json({error:'Ponto corporal adicional inválido'});
   points[name]=p.map(n=>Math.round(n*10000)/10000);
  }
  const data={active:true,ts:Date.now(),points};
  await cache.set(room,data,{ttl:65,name:'Movimento corporal do avatar'});
  return res.status(200).json({ok:true,ts:data.ts});
 }catch(e){
  console.error('avatar pose:',e);
  return res.status(503).json({error:'Sincronização temporariamente indisponível'});
 }
}
