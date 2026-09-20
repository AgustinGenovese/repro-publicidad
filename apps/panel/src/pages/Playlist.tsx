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
      setError(err instanceof Error ? err.message : 'Error al cargar')
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
      setError(err instanceof Error ? err.message : 'Error al guardar')
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
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6 items-start">
      <section>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Disponibles</h3>
        {available.length === 0 ? (
          <p className="text-sm text-slate-500">Todo el media está en la playlist.</p>
        ) : (
          <ul className="space-y-2">
            {available.map((m) => (
              <li
                key={m._id}
                className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg p-2"
              >
                <img src={m.url} alt="" className="w-12 h-8 object-cover rounded" />
                <span className="flex-1 text-xs text-slate-300 truncate">{m.originalName}</span>
                <button
                  onClick={() => addItem(m._id)}
                  className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
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
          <h3 className="text-sm font-medium text-slate-300">
            Playlist <span className="text-slate-500">· versión {version}</span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !changed || rows.length === 0}
              className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || changed}
              className="px-4 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-sm"
              title="Notificar a los TVs que recarguen la playlist"
            >
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
            <button
              onClick={refresh}
              disabled={saving || changed}
              className="px-4 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-sm text-slate-300 disabled:opacity-50"
            >
              Descartar
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        {synced && <p className="text-sm text-emerald-400 mb-3">Sincronizado ✓</p>}

        {loading ? (
          <p className="text-slate-400">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500">
            Playlist vacía. Agregá media desde la columna izquierda.
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
                className={`flex items-center gap-3 bg-slate-900 border rounded-lg p-2 cursor-grab ${
                  dragIndex !== null && overIndex === i ? 'border-slate-400' : 'border-slate-800'
                }`}
              >
                <span className="text-slate-600 select-none">⠿</span>
                <img src={r.mediaId.url} alt="" className="w-14 h-10 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{r.mediaId.originalName}</p>
                  <p className="text-xs text-slate-500">
                    {r.mediaId.type} · {i + 1}
                  </p>
                </div>
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="text-slate-400 hover:text-white disabled:opacity-30 text-xs leading-none"
                    title="Subir"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === rows.length - 1}
                    className="text-slate-400 hover:text-white disabled:opacity-30 text-xs leading-none"
                    title="Bajar"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => removeItem(i)}
                  className="text-xs text-red-400 hover:text-red-300"
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