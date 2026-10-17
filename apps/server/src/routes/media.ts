import { Router, Response } from 'express';
import { del } from '@vercel/blob';
import { Media } from '../models/Media.js';
import { authJWT } from '../middleware/authJWT.js';

const router = Router();

// El archivo se sube desde el navegador directo a Vercel Blob (ver /api/upload).
// Acá solo se persiste el resultado para no pasar el archivo por la función de Vercel.
router.post('/', authJWT, async (req, res: Response) => {
  try {
    const { type, url, pathname, originalName, mimeType, size } = req.body ?? {};

    if (type !== 'video' && type !== 'image') {
      return res.status(400).json({ message: 'type debe ser "video" o "image"' });
    }
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      return res.status(400).json({ message: 'url inválida' });
    }

    const media = await Media.create({
      type,
      filename: typeof pathname === 'string' && pathname ? pathname : url,
      originalName: typeof originalName === 'string' && originalName ? originalName : url,
      mimeType: typeof mimeType === 'string' ? mimeType : '',
      size: Number(size) || 0,
      url,
    });

    res.status(201).json(media);
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.get('/', authJWT, async (_req, res: Response) => {
  try {
    const media = await Media.find().sort({ createdAt: -1 });
    res.json(media);
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.delete('/:id', authJWT, async (req, res: Response) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: 'Media no encontrado' });

    if (media.url) {
      await del(media.url).catch(() => {});
    }
    await media.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;
