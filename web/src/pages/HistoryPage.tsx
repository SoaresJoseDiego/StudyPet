import { api } from '../api/client'
import type { SessionHistoryItem, Stats } from '../api/types'
import { EmptyState, ErrorBox, Loading } from '../components/ui'
import { formatHours, formatMinutes, numberFormat } from '../format'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'

// Tela "Web · Histórico" do design: gráfico de 7 dias e tabela de sessões.
const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' })

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).replace('.', '')
}

function when(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const day =
    date.toDateString() === today.toDateString()
      ? 'Hoje'
      : date.toDateString() === yesterday.toDateString()
        ? 'Ontem'
        : capitalize(dayFormat.format(date))
  return `${day}, ${timeFormat.format(date)}`
}

export function HistoryPage() {
  const user = useUser()
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.getStats(user.id), api.listSessions(user.id, 50)]),
    [user.id],
  )

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'Erro ao carregar.'} onRetry={reload} />

  const [stats, sessions] = data
  return (
    <div className="page">
      <div className="stack-xs">
        <h1 className="page-title">Histórico</h1>
        <p className="page-subtitle">
          Últimos 7 dias: {formatHours(stats.lastDays.focusMinutes)} de estudo e{' '}
          {numberFormat.format(stats.lastDays.slimes)} {stats.lastDays.slimes === 1 ? 'slime derrotado' : 'slimes derrotados'}.
        </p>
      </div>

      <DailyChart stats={stats} />

      <section className="card stack">
        <h2 className="card-title">Sessões</h2>
        {sessions.length === 0 ? (
          <EmptyState title="Nenhuma sessão ainda">
            <p className="muted">Suas sessões de estudo aparecem aqui.</p>
          </EmptyState>
        ) : (
          <SessionsTable sessions={sessions} />
        )}
      </section>
    </div>
  )
}

function DailyChart({ stats }: { stats: Stats }) {
  const days = stats.lastDays.daily
  const max = Math.max(...days.map((day) => day.minutes), 1)
  const label = days
    .map((day, index) => `${index === days.length - 1 ? 'hoje' : weekdayFormat.format(new Date(day.date))} ${day.minutes}`)
    .join(', ')

  return (
    <section className="card stack">
      <h2 className="card-title">Minutos estudados por dia</h2>
      <div role="img" aria-label={`Minutos por dia: ${label}`} className="bar-chart">
        {days.map((day, index) => {
          const isToday = index === days.length - 1
          return (
            <div key={day.date} className="bar-col">
              <span className="small strong">{day.minutes}</span>
              <div
                className={`bar ${day.minutes === 0 ? 'bar-empty' : ''} ${isToday ? 'bar-today' : ''}`}
                style={day.minutes === 0 ? undefined : { height: `${Math.max(4, (day.minutes / max) * 100)}%` }}
              />
              <span className={`small strong ${isToday ? '' : 'muted'}`}>
                {isToday ? 'Hoje' : capitalize(weekdayFormat.format(new Date(day.date)))}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SessionsTable({ sessions }: { sessions: SessionHistoryItem[] }) {
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Quando</th>
            <th>Curso</th>
            <th>Aula</th>
            <th>Duração</th>
            <th>Slimes</th>
            <th>Slime Rei</th>
            <th>Exp</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const completed = session.status === 'Completed'
            return (
              <tr key={session.id} className={completed ? undefined : 'row-muted'}>
                <td>{when(session.startedAt)}</td>
                <td>{session.courseTitle}</td>
                <td className="truncate-cell">{session.lessonTitle}</td>
                <td>
                  {completed
                    ? formatMinutes(session.focusMinutes)
                    : session.status === 'InProgress'
                      ? 'Em andamento'
                      : 'Cancelada'}
                </td>
                <td>{completed ? session.slimes : '—'}</td>
                <td>
                  {completed
                    ? session.kingSlimes > 0
                      ? session.kingSlimes === 1
                        ? 'Derrotado'
                        : `${session.kingSlimes} derrotados`
                      : 'Não apareceu'
                    : '—'}
                </td>
                <td className="strong">{completed ? `+${numberFormat.format(session.earnedExperience)}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
