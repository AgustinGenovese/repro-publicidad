import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMedia, getPlaylist, savePlaylist, sync, MediaItem, PlaylistItem } from '../api'

interface Row {
  mediaId: MediaItem
  sortOrder: number
}

export default function Playlist() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [changed, setChanged] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [all, playlist] = await Promise.all([getMedia(), getPlaylist()])
      setMedia(all)
      setRows(
        playlist.items
          .map((it: PlaylistItem) => ({
            mediaId: typeof it.mediaId === 'string' ? all.find((m) => m._id === it.mediaId)! : it.mediaId,
            sortOrder: it.sortOrder,
          }))
          .filter((r: Row) => r.mediaId)
      )
      setVersion(playlist.version)
      setChanged(false)
      setSynced(false)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la playlist.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const available = useMemo(() => {
    const inPlaylist = new Set(rows.map((r) => r.mediaId._id))
    return media.filter((m) => !inPlaylist.has(m._id))
  }, [media, rows])

  function addItem(id: string) {
    const item = media.find((m) => m._id === id)
    if (!item) return
    setRows((prev) => [...prev, { mediaId: item, sortOrder: prev.length }])
    setChanged(true)
  }

  function removeItem(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, sortOrder: i })))
    setChanged(true)
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length) return
    setRows((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next.map((r, i) => ({ ...r, sortOrder: i }))
    })
    setChanged(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const items = rows.map((r, i) => ({ mediaId: r.mediaId._id, sortOrder: i }))
      const result = await savePlaylist(items)
      setVersion(result.version)
      setChanged(false)
      setSynced(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la playlist.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError('')
    setSynced(false)
    try {
      const result = await sync()
      setVersion(result.version)
      setSynced(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
      <section>
        <h3 className="text-sm text-ash mb-3">Disponibles</h3>
        {available.length === 0 ? (
          <p className="text-sm text-ash">Todo el media ya está en la playlist.</p>
        ) : (
          <ul className="space-y-2">
            {available.map((m) => (
              <li
                key={m._id}
                className="flex items-center gap-3 bg-graphite border border-brass-dim/40 p-2"
              >
                <img src={m.url} alt="" className="w-12 h-8 object-cover" />
                <span className="flex-1 text-xs text-ash truncate">{m.originalName}</span>
                <button
                  onClick={() => addItem(m._id)}
                  className="text-xs px-2 py-1 border border-brass-dim/60 text-bone hover:border-brass hover:text-brass transition-colors"
                >
                  Agregar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-ash">
            En pantalla <span className="text-ash/70">· versión {version}</span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !changed || rows.length === 0}
              className="px-4 py-1.5 bg-brass text-ink font-semibold text-sm hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || changed}
              className="flex items-center gap-2 px-4 py-1.5 border border-brass text-bone text-sm hover:text-brass disabled:opacity-40 transition-colors"
              title="Avisar a los TVs que recarguen la playlist"
            >
              <span className={`pole h-4 w-4 shrink-0 ${syncing ? 'animate-pole' : ''}`} aria-hidden="true" />
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
            <button
              onClick={refresh}
              disabled={saving || changed}
              className="px-4 py-1.5 border border-brass-dim/40 text-ash text-sm hover:text-bone disabled:opacity-40 transition-colors"
            >
              Descartar
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-oxblood mb-3">{error}</p>}
        {synced && <p className="text-sm text-brass mb-3">Sincronizado</p>}

        {loading ? (
          <p className="text-ash">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-brass-dim/50 p-12 text-center">
            <p className="text-bone">La playlist está vacía</p>
            <p className="text-sm text-ash mt-2">Agregá fotos o videos desde la columna de la izquierda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li
                key={r.mediaId._id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverIndex(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) move(dragIndex, overIndex ?? i)
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                className={`flex items-center gap-3 bg-graphite border p-2 cursor-grab ${
                  dragIndex !== null && overIndex === i ? 'border-brass' : 'border-brass-dim/40'
                }`}
              >
                <span className="text-ash select-none">⠿</span>
                <img src={r.mediaId.url} alt="" className="w-14 h-10 object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-bone truncate">{r.mediaId.originalName}</p>
                  <p className="text-xs text-ash">
                    {r.mediaId.type} · {i + 1}
                  </p>
                </div>
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="text-ash hover:text-brass disabled:opacity-30 text-xs leading-none transition-colors"
                    title="Subir"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === rows.length - 1}
                    className="text-ash hover:text-brass disabled:opacity-30 text-xs leading-none transition-colors"
                    title="Bajar"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => removeItem(i)}
                  className="text-xs text-ash hover:text-oxblood transition-colors"
                  title="Quitar"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
