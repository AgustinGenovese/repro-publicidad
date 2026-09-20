import { useRef, useState } from 'react'
import { uploadMedia } from '../api'

export default function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) {
      setError('Solo se aceptan imágenes (jpg, png, webp)')
      return
    }
    setError('')
    setUploading(true)
    try {
      for (const file of images) {
        await uploadMedia(file)
      }
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
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
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-slate-500 bg-slate-800/40' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <p className="text-slate-300">{uploading ? 'Subiendo…' : 'Arrastrá imágenes o hacé clic para subir'}</p>
        <p className="text-sm text-slate-500 mt-1">JPG, PNG o WebP</p>
      </div>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  )
}