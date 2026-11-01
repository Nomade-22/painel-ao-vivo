import {issueSignedToken} from '@vercel/blob';
import {handleUploadPresigned} from '@vercel/blob/client';

const types=['image/png','image/jpeg','image/webp','image/gif'];
const limit=15*1024*1024;

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!process.env.BLOB_STORE_ID||!process.env.BLOB_WEBHOOK_PUBLIC_KEY){
  return res.status(503).json({error:'Armazenamento de imagens não configurado'});
 }
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const result=await handleUploadPresigned({
   body,request:req,onUploadCompleted:async()=>{},
   getSignedToken:async pathname=>{
    if(typeof pathname!=='string'||!/^cartas\/[a-zA-Z0-9_.() -]{1,140}\.(png|jpe?g|webp|gif)$/i.test(pathname)){
     throw new Error('Nome de imagem inválido');
    }
    const token=await issueSignedToken({pathname,operations:['put'],allowedContentTypes:types,
     maximumSizeInBytes:limit,validUntil:Date.now()+15*60*1000});
    return {token,urlOptions:{addRandomSuffix:true}};
   }
  });
  return res.status(200).json(result);
 }catch(err){
  console.error('Autorização de upload de imagem falhou:',err);
  return res.status(400).json({error:err instanceof Error?err.message:'Falha ao enviar imagem'});
 }
}
