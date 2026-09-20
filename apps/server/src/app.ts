import express from 'express';
import { mkdir } from 'node:fs/promises';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import playlistRoutes from './routes/playlist.js';
import playerRoutes from './routes/player.js';
import deviceRoutes from './routes/devices.js';
import { authJWT, AuthRequest } from './middleware/authJWT.js';
import { config } from './config.js';

const app = express();

app.use(express.json());

mkdir(config.uploadsDir, { recursive: true });

app.get('/ping', (_req, res) => {
  res.json({ ok: true });
});

app.use('/media', express.static(config.uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/devices', deviceRoutes);

app.get('/api/protegida', authJWT, (req: AuthRequest, res) => {
  res.json({ ok: true, user: req.user });
});

export default app;