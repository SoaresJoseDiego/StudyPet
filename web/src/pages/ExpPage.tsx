import { api } from '../api/client'
import { Slime } from '../components/Slime'
import { ErrorBox, FormProgressBar, Loading } from '../components/ui'
import { formatHours, numberFormat } from '../format'
import { STAGES, experienceToReach, levelProgress, stepCost } from '../progression'
import { useUser } from '../session-context'
import { KING_EVERY, ODDS, SLIMES, SLIME_KINDS, type SlimeKind } from '../slimes'
import { useAsync } from '../useAsync'

// Exp médio por slime: 59 em cada 60 seguem as chances; o 60º é Rei.
const AVERAGE_COMMON = ODDS.Lilas * SLIMES.Lilas.experience + ODDS.Azul * SLIMES.Azul.experience + ODDS.Rosa * SLIMES.Rosa.experience
const AVERAGE_PER_SLIME = ((KING_EVERY - 1) * AVERAGE_COMMON + SLIMES.Rei.experience) / KING_EVERY
const SESSION_MINUTES = 25
const AVERAGE_SESSION = Math.round(AVERAGE_PER_SLIME * SESSION_MINUTES) // 1 slime por minuto, em média
const CHART_LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 49]
const STAGE_LEVELS = new Set<number>(STAGES.map((stage) => stage.minLevel - 1).filter((level) => level > 0))

const ODDS_LABEL: Record<SlimeKind, string> = {
  Lilas: 'Comum · 60% de chance',
  Azul: 'Incomum · 28% de chance',
  Rosa: 'Raro · 12% de chance',
  Rei: `Chefe · a cada ${KING_EVERY} slimes`,
}

// Tela "Sistema de Exp" do design, com a sua evolução real.
export function ExpPage() {
  const user = useUser()
  const experience = user.character?.experience ?? 0
  const current = levelProgress(experience)
  const maxCost = stepCost(CHART_LEVELS[CHART_LEVELS.length - 1])

  return (
    <div className="page">
      <div className="stack-xs">
        <h1 className="page-title">Sistema de Exp</h1>
        <p className="page-subtitle">Pouca Exp por inimigo e níveis cada vez mais caros: cada evolução é uma conquista.</p>
      </div>

      <section className="grid-stats">
        {SLIME_KINDS.map((kind) => (
          <div key={kind} className={`stat-card exp-slime ${kind === 'Rei' ? 'exp-slime-king' : ''}`}>
            <div className={`exp-pop-static pop-${kind}`}>
              <div className="exp-pop-bubble">+{SLIMES[kind].experience} Exp</div>
            </div>
            <Slime kind={kind} size={90} />
            <span className="card-title-sm">{SLIMES[kind].name}</span>
            <span className="small strong muted">{ODDS_LABEL[kind]}</span>
          </div>
        ))}
      </section>

      <section className="card stack-sm">
        <div className="row-between baseline wrap">
          <h2 className="card-title">Seu nível agora</h2>
          <span className="strong muted">{numberFormat.format(experience)} Exp no total</span>
        </div>
        <div className="row-between strong">
          <span>
            Nível {current.level} → {current.level + 1}
          </span>
          <span className="muted">
            {numberFormat.format(current.into)} / {numberFormat.format(current.needed)} Exp
          </span>
        </div>
        <FormProgressBar percent={current.percent} label="Progresso no nível atual" thick />
        <p className="small muted">
          Faltam {numberFormat.format(current.needed - current.into)} Exp, cerca de{' '}
          {Math.max(1, Math.ceil((current.needed - current.into) / AVERAGE_SESSION))} sessões de 25 minutos.
        </p>
      </section>

      <div className="split align-start">
        <section className="card grow-1 stack">
          <div className="row-between baseline">
            <h2 className="card-title">Exp para subir de nível</h2>
            <span className="small strong muted">
              20 × nível<sup>1,35</sup>
            </span>
          </div>
          <div
            role="img"
            aria-label={`Exp para o próximo nível: ${CHART_LEVELS.map((level) => `nível ${level}, ${stepCost(level)}`).join('; ')}`}
            className="level-chart"
          >
            {CHART_LEVELS.map((level) => {
              const cost = stepCost(level)
              const isStage = STAGE_LEVELS.has(level) || level === 49
              const isYou = current.level >= level && (CHART_LEVELS.find((next) => next > level) ?? 999) > current.level
              return (
                <div key={level} className="bar-col">
                  <span className="tiny strong">{numberFormat.format(cost)}</span>
                  <div
                    className={`bar ${isStage ? 'bar-today' : ''} ${isYou ? 'bar-you' : ''}`}
                    style={{ height: `${Math.max(2, (cost / maxCost) * 100)}%` }}
                  />
                  <span className={`tiny strong ${isStage ? '' : 'muted'}`}>{level}</span>
                </div>
              )
            })}
          </div>
          <p className="small muted">
            Barras escuras: níveis antes de uma evolução. A barra contornada é a faixa em que você está (nível {current.level}).
          </p>
        </section>

        <section className="card grow-1 stack">
          <h2 className="card-title">Quanto rende e quanto custa</h2>
          <div className="highlight-box">
            <span className="card-title-sm">Sessão de 25 min ≈ {AVERAGE_SESSION} Exp</span>
            <span className="small strong muted">~25 slimes em waves, média de {AVERAGE_PER_SLIME.toFixed(1)} Exp cada</span>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Forma</th>
                  <th>Nível</th>
                  <th>Exp total</th>
                  <th>Sessões</th>
                  <th>Horas</th>
                  <th>Falta</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((stage) => {
                  const total = experienceToReach(stage.minLevel)
                  const sessions = Math.ceil(total / AVERAGE_SESSION)
                  const missing = Math.max(0, total - experience)
                  return (
                    <tr key={stage.number}>
                      <td className="strong">{stage.name}</td>
                      <td>{stage.minLevel}</td>
                      <td>{numberFormat.format(total)}</td>
                      <td>{sessions}</td>
                      <td>{formatHours(sessions * SESSION_MINUTES)}</td>
                      <td className={missing === 0 ? 'success strong' : undefined}>
                        {missing === 0 ? 'alcançada' : numberFormat.format(missing)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted">Bônus: +10% na primeira sessão do dia e +20% na sessão que bate a meta diária.</p>
        </section>
      </div>

      <YourProgress />
    </div>
  )
}

/** Exp acumulado nas últimas sessões concluídas. */
function YourProgress() {
  const user = useUser()
  const { data, error, loading, reload } = useAsync(() => api.listSessions(user.id, 30), [user.id])

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'Erro ao carregar.'} onRetry={reload} />

  const completed = data.filter((session) => session.status === 'Completed').reverse()
  if (completed.length === 0) return null

  const max = Math.max(...completed.map((session) => session.earnedExperience), 1)
  return (
    <section className="card stack">
      <div className="row-between baseline wrap">
        <h2 className="card-title">Sua evolução</h2>
        <span className="small strong muted">Exp das últimas {completed.length} sessões</span>
      </div>
      <div className="xp-history" role="img" aria-label={`Exp por sessão: ${completed.map((s) => s.earnedExperience).join(', ')}`}>
        {completed.map((session) => (
          <div key={session.id} className="xp-history-bar" title={`${session.courseTitle} · +${session.earnedExperience} Exp`}>
            <div className="bar" style={{ height: `${Math.max(3, (session.earnedExperience / max) * 100)}%` }} />
          </div>
        ))}
      </div>
    </section>
  )
}
