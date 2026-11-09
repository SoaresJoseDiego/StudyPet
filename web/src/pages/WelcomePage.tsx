import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { Pet } from '../components/Pet'
import { ErrorBox } from '../components/ui'
import { useSession } from '../session-context'

export function WelcomePage() {
  const { signIn } = useSession()
  const [mode, setMode] = useState<'create' | 'signin'>('create')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user =
        mode === 'create'
          ? await api.createUser(displayName, email, characterName)
          : await api.signIn(email)
      signIn(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="welcome">
      <section className="welcome-hero">
        <Pet stage={2} size={200} />
        <h1>StudyPet</h1>
        <p className="muted">
          Estude em ciclos de foco, faça pausas gentis e veja seu companheiro crescer junto com você.
        </p>
      </section>

      <form className="card stack" onSubmit={handleSubmit}>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            className={`tab ${mode === 'create' ? 'tab-active' : ''}`}
            onClick={() => setMode('create')}
          >
            Criar conta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`tab ${mode === 'signin' ? 'tab-active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Já tenho conta
          </button>
        </div>

        {mode === 'create' && (
          <label className="field">
            <span>Seu nome</span>
            <input
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}

        <label className="field">
          <span>E-mail</span>
          <input
            required
            type="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        {mode === 'create' && (
          <label className="field">
            <span>Nome do seu companheiro</span>
            <input
              placeholder="Pip"
              maxLength={40}
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
            />
          </label>
        )}

        {error && <ErrorBox message={error} />}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'create' ? 'Começar' : 'Entrar'}
        </button>

        {mode === 'signin' && (
          <p className="muted small">Entrada provisória só com e-mail, enquanto o login com senha não existe.</p>
        )}
      </form>
    </div>
  )
}
