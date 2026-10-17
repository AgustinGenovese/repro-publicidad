import express from 'express';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import playlistRoutes from './routes/playlist.js';
import playerRoutes from './routes/player.js';
import deviceRoutes from './routes/devices.js';
import uploadRoutes from './routes/upload.js';
import { authJWT, AuthRequest } from './middleware/authJWT.js';

const app = express();

app.use(express.json());
app.set('trust proxy', true);

app.get('/ping', (_req, res) => {
  res.json({ ok: true });
});

// En Vercel los estáticos de `public/**` los sirve el CDN (express.static se ignora).
// Estos redirects solo aplican en local o cuando el CDN no encuentra el archivo.
app.get('/', (_req, res) => {
  res.redirect('/panel/');
});

app.get('/panel', (_req, res) => {
  res.redirect('/panel/');
});

app.get('/player', (_req, res) => {
  res.redirect('/player/');
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/devices', deviceRoutes);

app.get('/api/protegida', authJWT, (req: AuthRequest, res) => {
  res.json({ ok: true, user: req.user });
});

export default app;
