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
  const [deviceId] = useState(() => getDeviceId())
  const [registered, setRegistered] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const { items, version, lastChangeAt } = usePlaylist(HEARTBEAT_MS)

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
      className={`h-dvh w-screen overflow-hidden select-none relative text-bone ${
        hasContent ? 'bg-black' : 'bg-ink'
      }`}
      onClick={() => setShowStatus((s) => !s)}
    >
      {hasContent ? (
        <Player items={items} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-7 px-8 text-center">
          <span className="pole h-28 w-4 rounded-[2px] animate-pole" aria-hidden="true" />
          <div>
            <h1 className="font-display text-5xl leading-none">Sarkirian</h1>
            <p className="text-ash mt-2 text-sm">Cartelería</p>
          </div>
          <p className="text-bone/70 max-w-sm text-sm leading-relaxed">
            Cargá fotos y videos en el panel y tocá Sincronizar para que aparezcan en esta
            pantalla.
          </p>
        </div>
      )}

      {showStatus && (
        <div className="absolute top-4 right-4 bg-ink/95 border border-brass-dim/50 px-5 py-4 text-sm space-y-1">
          <p className="text-ash text-xs">Estado del reproductor</p>
          <p className="text-ash">
            URL: <code className="text-bone text-xs">{window.location.href}</code>
          </p>
          <p className="text-ash">
            Versión: <span className="text-bone">{version ?? '—'}</span>
          </p>
          <p className="text-ash">
            Items: <span className="text-bone">{items.length}</span>
          </p>
          <p className="text-ash">
            Estado:{' '}
            <span className={hasContent ? 'text-brass' : 'text-ash'}>{hasContent ? 'reproduciendo' : 'sin contenido'}</span>
          </p>
          <p className="text-ash">
            Registro:{' '}
            <span className={registered ? 'text-brass' : 'text-oxblood'}>
              {registered ? 'conectado' : 'conectando'}
            </span>
          </p>
          {lastChangeAt !== null && (
            <p className="text-ash/80 text-xs">Cambio de versión detectado {timeAgo(lastChangeAt)}</p>
          )}
          <p className="text-ash/60 text-xs mt-1 pt-2 border-t border-brass-dim/30">
            ID: {deviceId.slice(0, 8)}… · tocá para ocultar
          </p>
        </div>
      )}
    </div>
  )
}
