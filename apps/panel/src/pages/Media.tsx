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
      setError(err instanceof Error ? err.message : 'No se pudo cargar el media.')
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

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {loading ? (
        <p className="text-ash">Cargando…</p>
      ) : media.length === 0 ? (
        <div className="border border-dashed border-brass-dim/50 p-12 text-center">
          <p className="text-bone">Todavía no hay media</p>
          <p className="text-sm text-ash mt-2">
            Subí la primera foto o video con el recuadro de arriba, después armá la playlist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-px bg-brass-dim/30 border border-brass-dim/30">
          {media.map((item) => (
            <MediaCard key={item._id} item={item} onDeleted={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
