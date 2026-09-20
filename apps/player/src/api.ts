export interface PlayerItem {
  mediaId: string
  type: 'video' | 'image'
  url: string
  duration: number
  sortOrder: number
}

export interface PlayerPlaylist {
  version: number
  items: PlayerItem[]
}

export function registerDevice(token: string) {
  return fetch('/api/devices/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'TV', token }),
  }).then(async (res) => {
    if (!res.ok) throw new Error('Error al registrar el dispositivo')
    return res.json()
  })
}

export function getPlaylist() {
  return fetch('/api/player/playlist').then(async (res) => {
    if (!res.ok) throw new Error('Error al obtener la playlist')
    return (await res.json()) as PlayerPlaylist
  })
}