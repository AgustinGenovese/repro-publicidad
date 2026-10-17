import { Router, Request, Response } from 'express';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { authJWT } from '../middleware/authJWT.js';

const router = Router();

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];

const MAX_SIZE = 200 * 1024 * 1024;

// Genera el token para la subida directa navegador -> Vercel Blob.
// El archivo nunca pasa por esta función (evita el límite de ~4.5 MB de Vercel).
router.post('/', authJWT, async (req: Request, res: Response) => {
  const body = req.body as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_SIZE,
        addRandomSuffix: true,
      }),
    });
    res.json(jsonResponse);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error de subida' });
  }
});

export default router;
