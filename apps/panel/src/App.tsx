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
    <div className="min-h-dvh bg-[#0d1117] text-white flex">
      <aside className="w-52 bg-slate-900/60 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-800">
          <h1 className="text-lg font-bold leading-tight">Repro Publicidad</h1>
          <p className="text-xs text-slate-500">Panel administrativo</p>
        </div>
        <nav className="flex-1 py-3 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                tab === t.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold">{active.label}</h2>
        </header>
        {tab === 'media' && <Media />}
        {tab === 'playlist' && <Playlist />}
        {tab === 'devices' && <Devices />}
      </main>
    </div>
  )
}