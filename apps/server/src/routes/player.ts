import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { getPlaylist } from '../models/Playlist.js';
import { authJWT } from '../middleware/authJWT.js';

interface PlayerItemMedia {
  _id: Types.ObjectId;
  type: string;
  url: string;
  duration: number;
  active: boolean;
}

const router = Router();

router.get('/playlist', async (req: Request, res: Response) => {
  try {
    const playlist = await getPlaylist();
    await playlist.populate('items.mediaId');

    const items = playlist.items
      .filter((item) => (item.mediaId as unknown as PlayerItemMedia)?.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const media = item.mediaId as unknown as PlayerItemMedia;
        return {
          mediaId: media._id,
          type: media.type,
          url: /^https?:\/\//.test(media.url)
            ? media.url
            : `${req.protocol}://${req.get('host')}${media.url}`,
          duration: media.duration,
          sortOrder: item.sortOrder,
        };
      });

    res.json({ version: playlist.version, items });
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/sync', authJWT, async (_req, res: Response) => {
  try {
    const playlist = await getPlaylist();
    playlist.version = playlist.version + 1;
    await playlist.save();
    res.json({ version: playlist.version, ok: true });
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;