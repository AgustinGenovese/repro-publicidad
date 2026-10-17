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
      setError(err instanceof Error ? err.message : 'No se pudo borrar.')
      setDeleting(false)
    }
  }

  return (
    <div className="bg-graphite p-3 flex flex-col gap-3 group">
      <div className="aspect-video bg-ink overflow-hidden">
        {item.type === 'video' ? (
          <video src={item.url} muted preload="metadata" className="w-full h-full object-contain" />
        ) : (
          <img src={item.url} alt={item.originalName} className="w-full h-full object-contain" loading="lazy" />
        )}
      </div>

      <p className="text-sm text-bone truncate" title={item.originalName}>
        {item.originalName}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ash">{formatSize(item.size)}</span>
        <span className={`text-xs px-1.5 py-0.5 border ${item.active ? 'border-brass text-brass' : 'border-ash/40 text-ash'}`}>
          {item.active ? 'activo' : 'inactivo'}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-ash hover:text-oxblood disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Borrando…' : 'Borrar'}
        </button>
      </div>

      {error && <p className="text-xs text-oxblood">{error}</p>}
    </div>
  )
}
