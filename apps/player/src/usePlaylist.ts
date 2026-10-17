import { useEffect, useRef, useState } from 'react'
import { getPlaylist, PlayerItem } from './api'

export function usePlaylist(pollMs = 30_000) {
  const [items, setItems] = useState<PlayerItem[]>([])
  const [version, setVersion] = useState<number | null>(null)
  const [changes, setChanges] = useState(0)
  const [lastChangeAt, setLastChangeAt] = useState<number | null>(null)
  const prevVersion = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false

    async function poll() {
      try {
        const playlist = await getPlaylist()
        if (stopped) return
        if (prevVersion.current !== null && prevVersion.current !== playlist.version) {
          setChanges((c) => c + 1)
          setLastChangeAt(Date.now())
        }
        prevVersion.current = playlist.version
        setVersion(playlist.version)
        setItems(playlist.items)
      } catch {
        // sin conexión: reintenta en el próximo ciclo
      }
    }

    poll()
    const id = setInterval(poll, pollMs)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [pollMs])

  return { items, version, changes, lastChangeAt }
}