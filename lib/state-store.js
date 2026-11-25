import {getCache as runtimeCache} from '@vercel/functions';
import {neon} from '@neondatabase/serverless';

// The SQL backend is authoritative. Never replace an existing database record
// with a cache miss or silently fall back after a database error.
const durableNamespaces=new Set(['painel-ao-vivo','painel-video-v1','painel-studio-v1','painel-animacoes-v1','painel-cartas-v1','painel-camera-v1','painel-retorno-v1']);
export function usesDatabase(namespace,env=process.env){
 return Boolean(env.V2J_DATABASE_URL)&&(durableNamespaces.has(namespace)||env.V2J_PERSIST_RETURNS==='1'&&namespace!=='painel-ao-vivo-microfone');
}
export function makeStore(namespace,query,legacy,{skipLegacy=false,keepForever=true}={}){
 const revisions=new Map();
 async function row(key){
  const rows=await query('SELECT value,revision::text AS revision, (expires_at IS NOT NULL AND expires_at <= now()) AS expired FROM public.v2j_state WHERE namespace=$1 AND key=$2',[namespace,key]);
  return rows[0]||null;
 }
 async function get(key){
  let current=await row(key);
  if(!current&&!skipLegacy){
   const old=await legacy().get(key);
   if(old!==null&&old!==undefined){
    await query('INSERT INTO public.v2j_state(namespace,key,value,expires_at) VALUES ($1,$2,$3::jsonb,CASE WHEN $4::integer IS NULL THEN NULL ELSE now()+($4::integer * interval \'1 second\') END) ON CONFLICT DO NOTHING RETURNING revision',[namespace,key,JSON.stringify(old),keepForever?null:2592000]);
    current=await row(key);
    if(!current)throw Error('Não foi possível confirmar a migração do estado');
   }
  }
  revisions.set(key,current?.revision||'0');
  return current&&!current.expired?current.value:null;
 }
 async function set(key,value,options={}){
  if(!revisions.has(key))await get(key);
  const expected=revisions.get(key);
  const ttl=keepForever?null:(Number.isInteger(options.ttl)&&options.ttl>0?options.ttl:2592000);
  const args=[namespace,key,JSON.stringify(value),ttl,expected];
  const result=expected==='0'?
   await query('INSERT INTO public.v2j_state(namespace,key,value,expires_at) VALUES ($1,$2,$3::jsonb,CASE WHEN $4::integer IS NULL THEN NULL ELSE now()+($4::integer * interval \'1 second\') END) ON CONFLICT DO NOTHING RETURNING revision::text AS revision',args.slice(0,4)):
   await query('UPDATE public.v2j_state SET value=$3::jsonb,revision=revision+1,updated_at=now(),expires_at=CASE WHEN $4::integer IS NULL THEN NULL ELSE now()+($4::integer * interval \'1 second\') END WHERE namespace=$1 AND key=$2 AND revision=$5::bigint RETURNING revision::text AS revision',args);
  if(!result.length){const e=Error('Estado alterado por outro dispositivo. Sincronize e tente novamente.');e.code='V2J_CONFLICT';throw e;}
  revisions.set(key,result[0].revision);
 }
 return {get,set};
}
export function getCache({namespace}){
 if(!usesDatabase(namespace))return runtimeCache({namespace});
 const sql=neon(process.env.V2J_DATABASE_URL);
 return makeStore(namespace,(q,p)=>sql.query(q,p),()=>runtimeCache({namespace}),{
  skipLegacy:process.env.V2J_SKIP_LEGACY==='1',
  keepForever:durableNamespaces.has(namespace)||namespace==='central-retorno-v1'
 });
}
