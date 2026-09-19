import mongoose from 'mongoose';
import { config } from './config.js';

let cached: typeof mongoose | null = null;

export async function connectDB() {
  if (cached) return cached;
  cached = await mongoose.connect(config.mongoUrl);
  return cached;
}