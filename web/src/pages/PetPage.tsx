import { Link } from 'react-router'
import { api } from '../api/client'
import { Pet } from '../components/Pet'
import { ErrorBox, FormProgressBar, Loading, StatCard } from '../components/ui'
import { formatHours, numberFormat } from '../format'
import { STAGES, characterFormProgress, experienceToReach } from '../progression'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'

// Tela "Web · Meu pet" do design.
export function PetPage() {
  const user = useUser()
  const { data: stats, error, loading, reload } = useAsync(() => api.getStats(user.id), [user.id])
  const character = user.character
  const progress = characterFormProgress(character)

  return (
    <div className="page">
      <h1 className="page-title">Meu pet</h1>

      <div className="split">
        <section className="card card-lg card-mint grow-1 center-text">
          <Pet stage={progress.stage.number} size={320} />
          <h2 className="display">{progress.stage.name}</h2>
          <p className="strong muted">
            {character?.name} · Forma {progress.stage.number} de {STAGES.length} · Nível {character?.level ?? 1}
          </p>
        </section>

        <section className="card card-lg grow-1 stack-lg">
          {progress.next ? (
            <div className="stack-sm">
              <div className="row-between baseline">
                <span className="card-title">Rumo ao {progress.next.name}</span>
                <span className="strong muted">Nível {progress.next.minLevel}</span>
              </div>
              <FormProgressBar percent={progress.percent} label={`Progresso até ${progress.next.name}`} thick />
              <div className="row-between strong">
                <span>
                  {numberFormat.format(progress.experienceIntoForm)} / {numberFormat.format(progress.experienceForForm)} Exp
                </span>
                <span className="muted">faltam {numberFormat.format(progress.experienceToNext)}</span>
              </div>
            </div>
          ) : (
            <p className="card-title">Forma final alcançada!</p>
          )}

          {loading && !stats ? (
            <Loading />
          ) : error || !stats ? (
            <ErrorBox message={error ?? 'Erro ao carregar.'} onRetry={reload} />
          ) : (
            <div className="grid-2-tight">
              <StatCard label="Horas estudadas" value={formatHours(stats.totals.focusMinutes)} />
              <StatCard label="Slimes derrotados" value={numberFormat.format(stats.totals.slimes)} />
              <StatCard label="Slimes Rei" value={stats.totals.kingSlimes} />
              <StatCard label="Maior sequência" value={`${stats.streak.longest} ${stats.streak.longest === 1 ? 'dia' : 'dias'}`} />
            </div>
          )}

          <div className="stack-sm">
            <h3 className="card-title-sm">Como ele ganha Exp</h3>
            <p className="muted">
              Os slimes chegam em waves de 4, sem parar, e cada minuto de estudo derrota um, valendo de 5 a 15 Exp. A cada 60
              slimes derrotados aparece um Slime Rei, valendo 30. Os níveis ficam cada vez mais caros.
            </p>
            <Link to="/exp" className="strong">
              Ver o sistema de Exp completo
            </Link>
          </div>
        </section>
      </div>

      <section className="card stack">
        <h2 className="card-title">Evolução</h2>
        <div className="grid-forms">
          {STAGES.map((stage) => {
            const reached = stage.number <= progress.stage.number
            const current = stage.number === progress.stage.number
            return (
              <div key={stage.number} className={`form-tile ${current ? 'form-tile-current' : ''}`}>
                <div className={reached ? undefined : 'pet-locked'}>
                  <Pet stage={stage.number} size={150} mood={reached ? 'idle' : 'sleepy'} />
                </div>
                <span className="card-title-sm">{reached ? stage.name : '???'}</span>
                <span className="small strong muted row">
                  {!reached && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" />
                    </svg>
                  )}
                  Nível {stage.minLevel}
                  {reached
                    ? current
                      ? ' · forma atual'
                      : ' · alcançada'
                    : ` · faltam ${numberFormat.format(Math.max(0, experienceToReach(stage.minLevel) - (character?.experience ?? 0)))} Exp`}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
