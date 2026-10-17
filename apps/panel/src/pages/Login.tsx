import { useState, FormEvent } from 'react'
import { login, setToken } from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await login(username, password)
      setToken(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos conectarnos. Revisá la red.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-ink">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-graphite border border-brass-dim/50 p-7 space-y-5 animate-rise"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-brass-dim/40">
          <span className="pole h-10 w-3 rounded-[2px] shrink-0" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl leading-none">Sarkirian</h1>
            <p className="text-xs text-ash mt-1">Cartelería · panel</p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-ash">Usuario</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1.5 w-full bg-ink border border-brass-dim/50 px-3 py-2 text-bone outline-none focus:border-brass transition-colors"
          />
        </label>

        <label className="block">
          <span className="text-sm text-ash">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full bg-ink border border-brass-dim/50 px-3 py-2 text-bone outline-none focus:border-brass transition-colors"
          />
        </label>

        {error && <p className="text-sm text-oxblood">{error}</p>}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full bg-brass text-ink font-semibold px-4 py-2.5 hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
