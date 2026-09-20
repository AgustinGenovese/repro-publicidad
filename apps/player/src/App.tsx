import { useEffect, useState } from 'react'
import { getDeviceId } from './DeviceId'
import { registerDevice } from './api'
import { usePlaylist } from './usePlaylist'
import Player from './components/Player'

const HEARTBEAT_MS = 30_000

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  return `hace ${Math.floor(minutes / 60)} h`
}

export default function App() {
  const deviceId = getDeviceId()
  const [registered, setRegistered] = useState(false)
  const [showStatus, setShowStatus] = useState(true)
  const { items, version, changes } = usePlaylist(HEARTBEAT_MS)
  const [lastChange, setLastChange] = useState<number | null>(null)

  useEffect(() => {
    if (changes > 0) setLastChange(Date.now())
  }, [changes])

  useEffect(() => {
    async function heartbeat() {
      try {
        await registerDevice(deviceId)
        setRegistered(true)
      } catch {
        setRegistered(false)
      }
    }
    heartbeat()
    const id = setInterval(heartbeat, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [deviceId])

  const hasContent = items.length > 0

  return (
    <div
      className="h-dvh w-screen bg-black text-white overflow-hidden select-none relative"
      onClick={() => setShowStatus((s) => !s)}
    >
      {hasContent ? (
        <Player items={items} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Repro Publicidad</h1>
          <p className="text-white/60 text-lg">Sin contenido</p>
          <p className="text-white/30 text-sm">
            Cargá media y armá la playlist en el panel, después tocá Sincronizar.
          </p>
        </div>
      )}

      {showStatus && (
        <div className="absolute top-4 right-4 bg-black/70 border border-white/15 rounded-xl px-5 py-4 text-sm space-y-1 backdrop-blur-sm">
          <p className="text-white/45 text-xs">Estado del reproductor</p>
          <p className="text-white/70">
            URL: <code className="text-white/90 text-xs">{window.location.href}</code>
          </p>
          <p className="text-white/70">Versión: <span className="text-white">{version ?? '—'}</span></p>
          <p className="text-white/70">Items: <span className="text-white">{items.length}</span></p>
          <p className="text-white/70">
            Estado:{' '}
            <span className={hasContent ? 'text-emerald-300' : 'text-amber-300'}>
              {hasContent ? 'reproduciendo' : 'sin contenido'}
            </span>
          </p>
          <p className="text-white/70">
            Registro:{' '}
            <span className={registered ? 'text-emerald-300' : 'text-red-300'}>
              {registered ? 'conectado' : 'conectando'}
            </span>
          </p>
          {lastChange !== null && (
            <p className="text-cyan-300 text-xs">Cambio de versión detectado {timeAgo(lastChange)}</p>
          )}
          <p className="text-white/30 text-xs mt-1 pt-2 border-t border-white/10">
            ID: {deviceId.slice(0, 8)}… · tocá para ocultar
          </p>
        </div>
      )}
    </div>
  )
}