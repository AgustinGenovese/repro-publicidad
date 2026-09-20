import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Device, ONLINE_WINDOW_MS } from '../models/Device.js';
import { authJWT } from '../middleware/authJWT.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, token } = req.body ?? {};
    const finalToken = typeof token === 'string' && token ? token : randomUUID();

    let device = await Device.findOne({ token: finalToken });
    if (!device) {
      device = await Device.create({
        name: typeof name === 'string' && name ? name : 'TV sin nombre',
        token: finalToken,
        lastSeen: new Date(),
        currentIp: req.ip ?? '',
      });
    } else {
      device.lastSeen = new Date();
      device.currentIp = req.ip ?? '';
      if (typeof name === 'string' && name) device.name = name;
      await device.save();
    }

    res.json({ device });
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.get('/', authJWT, async (_req, res: Response) => {
  try {
    const devices = await Device.find().sort({ lastSeen: -1 });
    const now = Date.now();
    const result = devices.map(({ _id, name, token, lastSeen, currentIp }) => ({
      _id,
      name,
      token,
      lastSeen,
      currentIp,
      online: now - lastSeen.getTime() < ONLINE_WINDOW_MS,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;