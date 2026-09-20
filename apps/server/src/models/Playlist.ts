import mongoose, { Schema, Document, Types } from 'mongoose';
import { Media } from './Media.js';

export interface IPlaylistItem {
  mediaId: Types.ObjectId;
  sortOrder: number;
}

export interface IPlaylist extends Document {
  items: IPlaylistItem[];
  version: number;
}

const PlaylistSchema = new Schema<IPlaylist>({
  items: [
    {
      mediaId: { type: Schema.Types.ObjectId, ref: Media, required: true },
      sortOrder: { type: Number, required: true },
    },
  ],
  version: { type: Number, default: 1 },
});

export const Playlist = mongoose.model<IPlaylist>('Playlist', PlaylistSchema);

export async function getPlaylist(): Promise<IPlaylist> {
  const existing = await Playlist.findOne();
  if (existing) return existing;
  return Playlist.create({ items: [], version: 1 });
}