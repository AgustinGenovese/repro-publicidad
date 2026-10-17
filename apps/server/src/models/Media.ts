import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  type: 'video' | 'image';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  duration: number;
  active: boolean;
}

const MediaSchema = new Schema<IMedia>(
  {
    type: { type: String, enum: ['video', 'image'], required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    url: { type: String, required: true },
    duration: { type: Number, default: 8 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Media = mongoose.model<IMedia>('Media', MediaSchema);
