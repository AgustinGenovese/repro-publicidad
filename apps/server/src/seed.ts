import bcrypt from 'bcrypt';
import { connectDB } from './db.js';
import { User } from './models/User.js';
import { config } from './config.js';

async function seed() {
  await connectDB();

  const exists = await User.findOne({ username: config.adminUsername });
  if (exists) {
    console.log(`Admin ya existe: ${config.adminUsername}`);
  } else {
    await User.create({
      username: config.adminUsername,
      passwordHash: await bcrypt.hash(config.adminPassword, 10),
    });
    console.log(`Admin creado: ${config.adminUsername}`);
  }

  console.log('Seed completado');
  process.exit(0);
}

seed();