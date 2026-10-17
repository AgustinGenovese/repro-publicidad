import { useCallback, useEffect, useState } from 'react'
import { getDevices, DeviceItem } from '../api'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'hace unos segundos'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return new Date(date).toLocaleString('es-AR')
}

export default function Devices() {
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const playerUrl = `http://${window.location.hostname}:3000/player`

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(playerUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const refresh = useCallback(async () => {
    try {
      setDevices(await getDevices())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los TVs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <div className="space-y-5">
      <div className="border border-brass-dim/40 bg-graphite px-4 py-3 flex items-center gap-3">
        <p className="text-sm text-ash">Abrí esta dirección en cada TV:</p>
        <code className="text-sm text-bone">{playerUrl}</code>
        <button
          onClick={copyUrl}
          className="ml-auto px-3 py-1 border border-brass-dim/60 text-xs text-bone hover:border-brass hover:text-brass transition-colors"
        >
          {copied ? 'Copiada' : 'Copiar'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ash">
          Se actualiza cada 15 segundos. Un TV está <span className="text-brass">en línea</span> si se conectó en los últimos 2 minutos.
        </p>
        <button
          onClick={refresh}
          className="shrink-0 px-4 py-1.5 border border-brass-dim/40 text-sm text-ash hover:text-bone transition-colors"
        >
          Refrescar
        </button>
      </div>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {loading ? (
        <p className="text-ash">Cargando…</p>
      ) : devices.length === 0 ? (
        <div className="border border-dashed border-brass-dim/50 p-12 text-center">
          <p className="text-bone">Todavía no hay TVs conectados</p>
          <p className="text-sm text-ash mt-2">Abrí la dirección de arriba en el navegador del televisor.</p>
        </div>
      ) : (
        <ul className="border border-brass-dim/40 divide-y divide-brass-dim/30">
          {devices.map((d) => (
            <li key={d._id} className="flex items-center gap-4 px-4 py-3 bg-graphite">
              <span
                className={`w-2.5 h-2.5 shrink-0 ${d.online ? 'bg-brass' : 'bg-ash/50'}`}
              />
              <span className="font-medium text-bone">{d.name}</span>
              <code className="flex-1 text-xs text-ash truncate">{d.token}</code>
              <span className="text-xs text-ash">{d.currentIp || '—'}</span>
              <span className="text-xs text-ash">{timeAgo(d.lastSeen)}</span>
              <span
                className={`text-xs px-1.5 py-0.5 border ${
                  d.online ? 'border-brass text-brass' : 'border-ash/40 text-ash'
                }`}
              >
                {d.online ? 'en línea' : 'sin conexión'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
