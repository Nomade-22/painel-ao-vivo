import {handleUpload} from '@vercel/blob/client';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Metodo nao permitido'});
 if(!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) || !process.env.UPLOAD_PASSWORD)return res.status(503).json({error:'Configure Blob e UPLOAD_PASSWORD na Vercel'});
 try{
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const result=await handleUpload({
   body:data,request:req,
   onBeforeGenerateToken:async(pathname,clientPayload)=>{
    if(clientPayload!==process.env.UPLOAD_PASSWORD)throw new Error('Senha de upload incorreta');
    if(!/\.(mp4|webm)$/i.test(pathname))throw new Error('Envie MP4 ou WebM');
    return {allowedContentTypes:['video/mp4','video/webm'],maximumSizeInBytes:1024*1024*1024,addRandomSuffix:true};
   },
   onUploadCompleted:async()=>{}
  });
  return res.status(200).json(result);
 }catch(e){return res.status(400).json({error:e.message||'Erro de upload'});}
}
