import {issueSignedToken} from '@vercel/blob';
import {handleUploadPresigned} from '@vercel/blob/client';

const TYPES=['image/webp','image/png','image/jpeg'];
const LIMIT=8*1024*1024;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!process.env.BLOB_STORE_ID||!process.env.BLOB_WEBHOOK_PUBLIC_KEY)
  return res.status(503).json({error:'Armazenamento de imagens indisponível'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const result=await handleUploadPresigned({
   body,request:req,onUploadCompleted:async()=>{},
   getSignedToken:async pathname=>{
    if(typeof pathname!=='string'||!/^avatars\/[a-zA-Z0-9_.,() -]{1,120}\.(png|jpg|jpeg|webp)$/i.test(pathname))
     throw new Error('Use PNG, JPEG ou WebP para a arte do avatar');
    const token=await issueSignedToken({
     pathname,operations:['put'],allowedContentTypes:TYPES,
     maximumSizeInBytes:LIMIT,validUntil:Date.now()+15*60*1000
    });
    return {token,urlOptions:{addRandomSuffix:true}};
   }
  });
  return res.status(200).json(result);
 }catch(error){
  console.error('Upload de arte do avatar:',error);
  return res.status(400).json({error:error instanceof Error?error.message:'Falha no upload'});
 }
}