import {usesDatabase} from '../lib/state-store.js';
import {neon} from '@neondatabase/serverless';
import {list} from '@vercel/blob';
import {timingSafeEqual} from 'node:crypto';
function authorized(req){
 const secret=process.env.V2J_ADMIN_TOKEN||'';
 const received=String(req.headers.authorization||'');
 const expected='Bearer '+secret;
 return secret.length>=24&&Buffer.byteLength(received)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(received),Buffer.from(expected));
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({erro:'Método inválido'});
 const mode=usesDatabase('painel-video-v1')?'neon':'runtime-cache';
 if(req.query?.check!=='1'&&req.query?.recover!=='1')return res.status(200).json({build:'recovery-v13',storage:mode,returns:usesDatabase('central-retorno-v1')?'neon':'runtime-cache'});
 if(!authorized(req))return res.status(401).json({erro:'Acesso administrativo necessário'});
 try{
  if(req.query?.recover==='1'){
   const result=await list({prefix:'videos/',limit:100,...(typeof req.query.cursor==='string'&&req.query.cursor?{cursor:req.query.cursor}:{})});
   return res.status(200).json({videos:result.blobs.map(b=>({url:b.url,name:b.pathname.split('/').pop(),size:b.size})),hasMore:result.hasMore,cursor:result.cursor});
  }
  if(mode!=='neon')return res.status(503).json({build:'recovery-v13',storage:mode,connected:false});
  const sql=neon(process.env.V2J_DATABASE_URL);
  const rows=await sql.query('SELECT 1 AS ready FROM public.v2j_state LIMIT 1',[]);
  return res.status(200).json({build:'recovery-v13',storage:mode,connected:true});
 }catch{return res.status(503).json({erro:'Diagnóstico indisponível. Verifique a conexão na Vercel.'});}
}
