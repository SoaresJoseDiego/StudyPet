import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { ErrorBox } from '../components/ui'
import { formatMinutes } from '../format'
import { useSession, useUser } from '../session-context'

const GOAL_PRESETS = [30, 60, 90, 120]

export function SettingsPage() {
  const user = useUser()
  const { refreshUser } = useSession()
  const [goal, setGoal] = useState(user.dailyGoalMinutes)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await api.updateDailyGoal(user.id, goal)
      await refreshUser()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Ajustes</h1>

      <form className="card stack" onSubmit={handleSubmit}>
        <h2 className="h3">Meta diária de foco</h2>
        <p className="muted small">
          Ao bater a meta, a sessão que completar o dia ganha +20% de XP (uma vez por dia).
        </p>
        <div className="presets">
          {GOAL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`preset ${goal === preset ? 'preset-active' : ''}`}
              onClick={() => setGoal(preset)}
            >
              {formatMinutes(preset)}
            </button>
          ))}
          <label className="preset preset-custom">
            <input
              type="number"
              min={5}
              max={600}
              value={goal}
              aria-label="Meta em minutos"
              onChange={(e) => setGoal(Number(e.target.value) || 0)}
            />
            min
          </label>
        </div>
        {error && <ErrorBox message={error} />}
        {saved && <p className="success small">Meta salva!</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || goal === user.dailyGoalMinutes}>
          {busy ? 'Salvando…' : 'Salvar meta'}
        </button>
      </form>

      <section className="card stack-sm">
        <h2 className="h3">Conta</h2>
        <p>
          {user.displayName} <span className="muted">· {user.email}</span>
        </p>
        <p className="muted small">Companheiro: {user.character?.name ?? '—'}</p>
      </section>
    </div>
  )
}
