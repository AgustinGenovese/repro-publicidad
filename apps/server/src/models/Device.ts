import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  name: string;
  token: string;
  lastSeen: Date;
  currentIp: string;
}

const DeviceSchema = new Schema<IDevice>(
  {
    name: { type: String, default: 'TV sin nombre' },
    token: { type: String, required: true, unique: true },
    lastSeen: { type: Date, required: true },
    currentIp: { type: String },
  },
  { timestamps: true }
);

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;