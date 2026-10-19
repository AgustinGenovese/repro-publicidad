const TOKEN_KEY = 'repro_token';

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event('auth:login'));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('auth:logout'));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('Sesión expirada');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || 'Error del servidor');
  }
  return data as T;
}

export function login(username: string, password: string) {
  return request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export interface MediaItem {
  _id: string;
  type: 'video' | 'image';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  duration: number;
  active: boolean;
  createdAt: string;
}

export function getMedia() {
  return request<MediaItem[]>('/api/media');
}

export async function uploadMedia(file: File) {
  const token = getToken();
  
  // 1. Pedir token de subida al server
  const uploadRes = await request<{ token: string; uploadUrl: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      pathname: `media/${Date.now()}-${safeName(file.name)}`,
      contentType: file.type,
    }),
  });

  // 2. Subir directo a Vercel Blob con el token
  const blobRes = await fetch(uploadRes.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'Authorization': `Bearer ${uploadRes.token}`,
    },
    body: file,
  });

  if (!blobRes.ok) {
    throw new Error('Error subiendo a Blob');
  }

  const blob = await blobRes.json();

  // 3. Persistir metadatos en server
  return request<MediaItem>('/api/media', {
    method: 'POST',
    body: JSON.stringify({
      type: file.type.startsWith('video/') ? 'video' : 'image',
      url: blob.url,
      pathname: blob.pathname,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
}

export function deleteMedia(id: string) {
  return request<{ ok: boolean }>(`/api/media/${id}`, { method: 'DELETE' });
}

export function getDevices() {
  return request<DeviceItem[]>('/api/devices');
}

export interface DeviceItem {
  _id: string;
  name: string;
  token: string;
  lastSeen: string;
  currentIp: string;
  online: boolean;
}

export interface PlaylistItem {
  mediaId: MediaItem | string;
  sortOrder: number;
}

export interface Playlist {
  _id: string;
  items: PlaylistItem[];
  version: number;
}

export function getPlaylist() {
  return request<Playlist>('/api/playlist');
}

export function savePlaylist(items: { mediaId: string; sortOrder: number }[]) {
  return request<Playlist>('/api/playlist', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export function sync() {
  return request<{ ok: boolean; version: number }>('/api/player/sync', { method: 'POST' });
}