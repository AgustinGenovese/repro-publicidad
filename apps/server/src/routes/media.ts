import { Router, Response, Request, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { promises as fs } from 'node:fs';
import { Media } from '../models/Media.js';
import { config } from '../config.js';
import { authJWT } from '../middleware/authJWT.js';

const MAX_SIZE = 200 * 1024 * 1024;

const ACCEPTED_MIMES: Record<string, 'video' | 'image'> = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_MIMES[file.mimetype]) return cb(null, true);
    cb(new Error(`Formato no soportado: ${file.mimetype}`));
  },
});

const router = Router();

function handleMulterError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Archivo supera el límite de 200 MB' : err.message;
    return res.status(400).json({ message });
  }
  if (err instanceof Error) return res.status(400).json({ message: err.message });
  next(err);
}

router.post('/', authJWT, upload.single('file'), async (req, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Archivo requerido (field: file)' });

    const type = ACCEPTED_MIMES[file.mimetype];
    const media = await Media.create({
      type,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/media/${file.filename}`,
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

    await fs.unlink(`${config.uploadsDir}/${media.filename}`).catch(() => {});
    await media.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.use(handleMulterError);

export default router;