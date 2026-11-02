import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned } from '@vercel/blob/client';

const MAX_SIZE = 250 * 1024 * 1024;
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const IMAGE_TYPES=['image/webp','image/png','image/jpeg'];
const MAX_IMAGE_SIZE=8*1024*1024;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    return res.status(200).json({
      blobStoreConfigured: Boolean(process.env.BLOB_STORE_ID),
      oidcConnection: Boolean(process.env.BLOB_STORE_ID && process.env.BLOB_WEBHOOK_PUBLIC_KEY),
      mode: 'oidc-presigned',
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!process.env.BLOB_STORE_ID || !process.env.BLOB_WEBHOOK_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Conexão OIDC do Vercel Blob incompleta' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleUploadPresigned({
      body,
      request: req,
      onUploadCompleted: async () => {},
      getSignedToken: async (pathname) => {
        const video=typeof pathname==='string' && /^videos\/[a-zA-Z0-9_.,() -]{1,160}\.(mp4|webm)$/i.test(pathname);
        const avatar=typeof pathname==='string' && /^avatars\/[a-zA-Z0-9_.,() -]{1,120}\.(png|webp|jpg|jpeg)$/i.test(pathname);
        if(!video&&!avatar)throw new Error('Nome ou extensão do arquivo inválido');
        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          allowedContentTypes: avatar?IMAGE_TYPES:VIDEO_TYPES,
          maximumSizeInBytes: avatar?MAX_IMAGE_SIZE:MAX_SIZE,
          validUntil: Date.now() + 15 * 60 * 1000,
        });
        return { token, urlOptions: { addRandomSuffix: true } };
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Erro ao autorizar upload OIDC:', err);
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Não foi possível autorizar upload' });
  }
}
