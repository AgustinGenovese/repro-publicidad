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
      setError(err instanceof Error ? err.message : 'Error al cargar')
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
    <div className="space-y-4">
      <div className="border border-slate-800 bg-slate-900 rounded-xl px-4 py-3 flex items-center gap-3">
        <p className="text-sm text-slate-400">
          URL para los televisores:
        </p>
        <code className="text-sm text-cyan-300">{playerUrl}</code>
        <button
          onClick={copyUrl}
          className="ml-auto px-3 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-xs text-slate-300"
        >
          {copied ? 'Copiada' : 'Copiar'}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Se actualiza cada 15 segundos. Un TV se considera <b className="text-emerald-400">online</b> si conectó en los últimos 2 minutos.
        </p>
        <button
          onClick={refresh}
          className="px-4 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-sm text-slate-300"
        >
          Refrescar
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : devices.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500">
          No hay TVs registrados todavía.
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {devices.map((d) => (
            <li key={d._id} className="flex items-center gap-4 px-4 py-3">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  d.online ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              <span className="font-medium text-slate-200">{d.name}</span>
              <code className="flex-1 text-xs text-slate-500 truncate">{d.token}</code>
              <span className="text-xs text-slate-500">{d.currentIp || '—'}</span>
              <span className="text-xs text-slate-400">{timeAgo(d.lastSeen)}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  d.online ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {d.online ? 'online' : 'offline'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}