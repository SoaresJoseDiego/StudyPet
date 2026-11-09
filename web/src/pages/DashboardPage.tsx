import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api/client'
import type { Dashboard, Stats } from '../api/types'
import { Pet } from '../components/Pet'
import { Slime } from '../components/Slime'
import { EmptyState, ErrorBox, FormProgressBar, Loading, ProgressBar, StatCard } from '../components/ui'
import { formatHours, formatMinutes, numberFormat } from '../format'
import { characterFormProgress } from '../progression'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'

// Tela "Web · Início" do design.
const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function relativeDay(date: Date, today: Date): string {
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' }).format(date))
}

export function DashboardPage() {
  const user = useUser()
  const [openedAt] = useState(() => new Date())
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.getDashboard(user.id), api.getStats(user.id)]),
    [user.id],
  )

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'Erro ao carregar.'} onRetry={reload} />

  const [dashboard, stats] = data
  return (
    <div className="page">
      <div className="stack-xs">
        <p className="eyebrow">{capitalize(dateFormat.format(openedAt))}</p>
        <h1 className="page-title">
          {stats.totals.sessions === 0 ? `Boas-vindas, ${dashboard.displayName.split(' ')[0]}!` : 'Bom te ver de volta!'}
        </h1>
      </div>

      <PetCard dashboard={dashboard} />

      <div className="grid-stats">
        <StatCard
          label="Estudado hoje"
          value={formatMinutes(stats.today.focusMinutes)}
          hint={`meta de ${formatMinutes(dashboard.today.goalMinutes)}${dashboard.today.goalReached ? ' · batida!' : ''}`}
        />
        <StatCard label="Sequência" value={`${stats.streak.current} ${stats.streak.current === 1 ? 'dia' : 'dias'}`} />
        <StatCard label="Slimes derrotados" value={numberFormat.format(stats.totals.slimes)} />
        <StatCard label="Exp na semana" value={numberFormat.format(stats.week.experience)} />
      </div>

      <div className="split">
        <WeeklyGoals stats={stats} />
        <LastEncounter stats={stats} today={openedAt} />
      </div>
    </div>
  )
}

function PetCard({ dashboard }: { dashboard: Dashboard }) {
  const character = dashboard.character
  const progress = characterFormProgress(character)
  const active = dashboard.activeSession

  const message = active
    ? `${character?.name ?? 'Seu pet'} está enfrentando as waves de slimes na sessão de "${active.lessonTitle}".`
    : progress.next
      ? `Mais ${numberFormat.format(progress.experienceToNext)} Exp e ${character?.name ?? 'ele'} chega à forma ${progress.next.name}. Uma sessão de 25 minutos rende cerca de 200 Exp.`
      : `${character?.name ?? 'Seu pet'} já está na forma final. Continue estudando para subir de nível!`

  return (
    <section className="card card-lg pet-card">
      <div className="pet-stage-box">
        <Pet stage={progress.stage.number} size={250} mood={dashboard.today.sessions === 0 && !active ? 'sleepy' : 'idle'} />
      </div>
      <div className="pet-card-info">
        <p className="eyebrow">Seu pet{character ? ` · ${character.name}` : ''}</p>
        <div className="row wrap baseline">
          <h2 className="display">{progress.stage.name}</h2>
          <span className="strong big-text">Nível {character?.level ?? 1}</span>
        </div>
        <div className="stack-sm max-w">
          <FormProgressBar percent={progress.percent} label={`Progresso até ${progress.next?.name ?? 'forma final'}`} thick />
          <div className="row-between strong">
            <span>{numberFormat.format(character?.experience ?? 0)} Exp</span>
            <span className="muted">
              {progress.next ? `${numberFormat.format(progress.experienceToNext)} Exp até ${progress.next.name}` : 'Forma final'}
            </span>
          </div>
        </div>
        <p className="muted max-w">{message}</p>
        <div className="row wrap">
          <Link to="/estudar" className="btn btn-primary btn-lg">
            {active ? 'Voltar para a sessão' : 'Começar sessão de estudo'}
          </Link>
          <Link to="/pet" className="btn btn-ghost btn-lg">
            Ver evolução
          </Link>
        </div>
      </div>
    </section>
  )
}

function WeeklyGoals({ stats }: { stats: Stats }) {
  const courses = stats.week.byCourse
  return (
    <section className="card grow-2 stack">
      <div className="row-between">
        <h2 className="card-title">Meta da semana por curso</h2>
        <Link to="/cursos" className="small strong">
          Meus cursos
        </Link>
      </div>
      {courses.length === 0 ? (
        <EmptyState title="Nenhum curso ainda">
          <Link to="/cursos/novo" className="btn btn-primary btn-sm">
            Adicionar curso
          </Link>
        </EmptyState>
      ) : (
        courses.map((course) => (
          <div key={course.courseId} className="stack-sm">
            <div className="row-between strong">
              <Link to={`/cursos/${course.courseId}`} className="truncate plain-link">
                {course.title}
              </Link>
              <span className="muted nowrap">
                {course.goalMinutes
                  ? `${formatHours(course.minutes)} de ${formatHours(course.goalMinutes)}`
                  : `${formatHours(course.minutes)} · sem meta`}
              </span>
            </div>
            <ProgressBar value={course.minutes} max={course.goalMinutes ?? Math.max(course.minutes, 1)} label={`Meta semanal de ${course.title}`} />
          </div>
        ))
      )}
    </section>
  )
}

function LastEncounter({ stats, today }: { stats: Stats; today: Date }) {
  const last = stats.lastEncounter
  return (
    <section className="card grow-1 stack">
      <h2 className="card-title">Último encontro</h2>
      {!last || !last.slimeKind ? (
        <p className="muted">Nenhum slime ainda. Comece uma sessão e veja quem aparece pela cerca.</p>
      ) : (
        <>
          <div className="row">
            <Slime kind={last.slimeKind} size={88} />
            <div className="stack-xs">
              <span className="card-title-sm">{last.slimeName} derrotado</span>
              <span className="small strong muted">
                {relativeDay(new Date(last.finishedAt), today)}, {timeFormat.format(new Date(last.finishedAt))} · {last.courseTitle}
              </span>
            </div>
          </div>
          <p className="muted">
            Sessão de {formatMinutes(last.focusMinutes)}: +{numberFormat.format(last.earnedExperience)} Exp e {last.slimes}{' '}
            {last.slimes === 1 ? 'slime' : 'slimes'}.
          </p>
          <Link to="/historico" className="strong">
            Ver histórico
          </Link>
        </>
      )}
    </section>
  )
}
