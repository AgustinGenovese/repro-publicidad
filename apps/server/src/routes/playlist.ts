import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Media } from '../models/Media.js';
import { getPlaylist } from '../models/Playlist.js';
import { authJWT } from '../middleware/authJWT.js';

const router = Router();

router.get('/', authJWT, async (_req, res: Response) => {
  try {
    const playlist = await getPlaylist();
    await playlist.populate('items.mediaId');
    res.json(playlist);
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.put('/', authJWT, async (req, res: Response) => {
  try {
    const rawItems = req.body?.items as { mediaId?: string; sortOrder?: number }[] | undefined;
    if (!Array.isArray(rawItems)) {
      return res.status(400).json({ message: 'items debe ser un arreglo' });
    }

    const bodies = rawItems.filter((i) => i && typeof i.mediaId === 'string');
    const mediaIds = bodies.map((i) => i.mediaId as string);
    const found = await Media.find({ _id: { $in: mediaIds } }).select('_id');
    const foundIds = new Set(found.map((m) => m.id));
    const missing = mediaIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      return res.status(400).json({ message: 'Media inexistente', mediaIds: missing });
    }

    const playlist = await getPlaylist();
    playlist.items = bodies.map((item, index) => ({
      mediaId: new Types.ObjectId(item.mediaId as string),
      sortOrder: item.sortOrder ?? index,
    }));
    playlist.version = playlist.version + 1;
    await playlist.save();

    res.json(playlist);
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;