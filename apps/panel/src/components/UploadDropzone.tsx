import { useRef, useState } from 'react'
import { uploadMedia } from '../api'

export default function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'video/mp4' || f.type === 'video/webm'
    )
    if (accepted.length === 0) {
      setError('Solo se aceptan fotos (JPG, PNG, WebP) o videos (MP4, WebM).')
      return
    }
    setError('')
    setUploading(true)
    try {
      for (const file of accepted) {
        await uploadMedia(file)
      }
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`border border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-brass bg-graphite' : 'border-brass-dim/50 hover:border-brass'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <p className="text-bone">
          {uploading ? 'Subiendo…' : 'Arrastrá fotos o videos, o hacé clic para elegirlos'}
        </p>
        <p className="text-sm text-ash mt-1.5">JPG, PNG, WebP, MP4 o WebM · hasta 200 MB</p>
      </div>
      {error && <p className="text-sm text-oxblood mt-2">{error}</p>}
    </div>
  )
}
