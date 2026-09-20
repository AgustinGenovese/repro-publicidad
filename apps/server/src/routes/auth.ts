import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config.js';

const router = Router();

router.post('/login', async (req, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const payload = { _id: user._id.toString(), username: user.username };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;