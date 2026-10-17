import { useEffect, useState } from 'react'
import { getToken, clearToken } from './api'
import Login from './pages/Login'
import Media from './pages/Media'
import Playlist from './pages/Playlist'
import Devices from './pages/Devices'

type Tab = 'media' | 'playlist' | 'devices'

const TABS: { id: Tab; label: string }[] = [
  { id: 'media', label: 'Media' },
  { id: 'playlist', label: 'Playlist' },
  { id: 'devices', label: 'TVs' },
]

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()))
  const [tab, setTab] = useState<Tab>('media')

  useEffect(() => {
    const onLogin = () => setLoggedIn(true)
    const onLogout = () => setLoggedIn(false)
    window.addEventListener('auth:login', onLogin)
    window.addEventListener('auth:logout', onLogout)
    return () => {
      window.removeEventListener('auth:login', onLogin)
      window.removeEventListener('auth:logout', onLogout)
    }
  }, [])

  function handleLogout() {
    clearToken()
    setLoggedIn(false)
  }

  if (!loggedIn) return <Login />

  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="min-h-dvh bg-ink text-bone flex">
      <aside className="w-56 bg-graphite-deep border-r border-brass-dim/40 flex flex-col">
        <div className="px-5 py-6 border-b border-brass-dim/40 flex items-center gap-3">
          <span className="pole h-9 w-2.5 rounded-[2px] shrink-0" aria-hidden="true" />
          <div className="animate-rise">
            <h1 className="font-display text-xl leading-none text-bone">Sarkirian</h1>
            <p className="text-[11px] text-ash mt-1">Cartelería · panel</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-5 py-2.5 text-sm border-l-2 transition-colors ${
                tab === t.id
                  ? 'border-brass bg-graphite text-bone'
                  : 'border-transparent text-ash hover:text-bone hover:bg-graphite/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-brass-dim/40">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-ash hover:text-bone transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 sm:p-8">
        <header className="mb-8 flex items-baseline gap-3">
          <h2 className="font-display text-3xl leading-none">{active.label}</h2>
          <span className="h-px flex-1 bg-brass-dim/40" aria-hidden="true" />
        </header>
        {tab === 'media' && <Media />}
        {tab === 'playlist' && <Playlist />}
        {tab === 'devices' && <Devices />}
      </main>
    </div>
  )
}
