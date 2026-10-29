import { getCache } from '@vercel/functions';

const defaultPanel = {texto:'',fonte:'Arial, sans-serif',tamanho:64,cor:'#ffffff',fundo:'#0e1628',alinhamento:'center',peso:'700'};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const cache=getCache({namespace:'painel-ao-vivo'});
  if(req.method==='GET'){
    try{const data=await cache.get('atual');return res.status(200).json(data||{painel:defaultPanel,versao:0});}
    catch(e){console.error('cache read',e);return res.status(503).json({erro:'Leitura indisponível'});}
  }
  if(req.method!=='PUT'){res.setHeader('Allow','GET, PUT');return res.status(405).json({erro:'Método inválido'});}
  const token=req.headers.authorization?.replace(/^Bearer /,'');
  if(!process.env.ADMIN_TOKEN||token!==process.env.ADMIN_TOKEN)return res.status(401).json({erro:'Chave inválida'});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!data||typeof data.texto!=='string'||data.texto.length>10000||typeof data.tamanho!=='number'||data.tamanho<16||data.tamanho>180)return res.status(400).json({erro:'Dados inválidos'});
  const fields=['texto','fonte','tamanho','cor','fundo','alinhamento','peso'];
  const painel=Object.fromEntries(fields.map(k=>[k,data[k]]));
  const estado={painel,versao:Date.now()};
  try{await cache.set('atual',estado,{ttl:86400,name:'Painel exibido'});return res.status(200).json({ok:true,versao:estado.versao});}
  catch(e){console.error('cache write',e);return res.status(503).json({erro:'Gravação indisponível'});}
}
