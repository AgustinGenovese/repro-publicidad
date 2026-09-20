import { useState } from 'react'
import { deleteMedia, MediaItem } from '../api'

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function MediaCard({ item, onDeleted }: { item: MediaItem; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!window.confirm(`¿Borrar "${item.originalName}"?`)) return
    setDeleting(true)
    setError('')
    try {
      await deleteMedia(item._id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al borrar')
      setDeleting(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="aspect-video bg-slate-950">
        {item.type === 'video' ? (
          <video src={item.url} muted preload="metadata" className="w-full h-full object-contain" />
        ) : (
          <img src={item.url} alt={item.originalName} className="w-full h-full object-contain" loading="lazy" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm text-slate-200 truncate" title={item.originalName}>
          {item.originalName}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{formatSize(item.size)}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              item.active ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {item.active ? 'activo' : 'inactivo'}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {deleting ? 'Borrando…' : 'Borrar'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}