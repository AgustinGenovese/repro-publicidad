import { useCallback, useEffect, useState } from 'react'
import { getMedia, MediaItem } from '../api'
import UploadDropzone from '../components/UploadDropzone'
import MediaCard from '../components/MediaCard'

export default function Media() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setMedia(await getMedia())
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

  return (
    <div className="space-y-6">
      <UploadDropzone onUploaded={refresh} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : media.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500">
          Todavía no hay media. Subí una imagen para empezar.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {media.map((item) => (
            <MediaCard key={item._id} item={item} onDeleted={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}