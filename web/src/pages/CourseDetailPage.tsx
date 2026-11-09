import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api/client'
import type { CourseDetail, CourseModule, Lesson } from '../api/types'
import { Pet } from '../components/Pet'
import { EmptyState, ErrorBox, Loading, ProgressBar, StatCard } from '../components/ui'
import { CATEGORY_LABELS, COURSE_COLORS, MOOD_LABELS, formatHours, numberFormat } from '../format'
import { characterFormProgress } from '../progression'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'
import type { StudyLocationState } from './StudyPage'

const dayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })

// Tela "Web · Detalhe do curso" do design.
export function CourseDetailPage() {
  const user = useUser()
  const { courseId: rawId = '' } = useParams()
  const courseId = Number(rawId)
  const navigate = useNavigate()
  const { data: course, error, loading, reload } = useAsync(() => api.getCourse(user.id, courseId), [user.id, courseId])
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading && !course) return <Loading />
  if (error || !course) return <ErrorBox message={error ?? 'Curso não encontrado.'} onRetry={reload} />

  const { stats } = course
  const percent = stats.totalLessons ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0
  const color = COURSE_COLORS[course.color] ?? COURSE_COLORS.verde

  async function run(action: () => Promise<unknown>) {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro inesperado.')
    }
  }

  function study(lessonId?: number) {
    const state: StudyLocationState = { courseId: course!.id, lessonId }
    navigate('/estudar', { state })
  }

  return (
    <div className="page">
      <Link to="/cursos" className="back-link">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
        Meus cursos
      </Link>

      <div className="page-header">
        <div className="stack-sm">
          <span className="tag" style={{ background: color.tint }}>
            {CATEGORY_LABELS[course.category]}
            {course.provider ? ` · ${course.provider}` : ''}
          </span>
          <h1 className="page-title">{course.title}</h1>
          {(course.instructor || course.sourceUrl) && (
            <p className="small muted">
              {course.instructor}
              {course.instructor && course.sourceUrl && ' · '}
              {course.sourceUrl && (
                <a href={course.sourceUrl} target="_blank" rel="noreferrer noopener">
                  abrir na plataforma
                </a>
              )}
            </p>
          )}
        </div>
        <div className="header-controls">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => run(() => api.setCourseArchived(user.id, course.id, !course.isArchived))}
          >
            {course.isArchived ? 'Desarquivar' : 'Arquivar'}
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => study(course.nextLesson?.id)} disabled={!stats.totalLessons}>
            Estudar este curso
          </button>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Aulas" value={`${stats.completedLessons} de ${stats.totalLessons}`} />
        <StatCard label="Tempo estudado" value={formatHours(stats.focusMinutes)} />
        <StatCard label="Sessões" value={stats.sessions} />
        <StatCard label="Exp neste curso" value={numberFormat.format(stats.experience)} />
      </div>

      {actionError && <ErrorBox message={actionError} />}

      <div className="split align-start">
        <section className="card grow-2 stack-sm">
          <div className="row-between baseline">
            <h2 className="card-title">Módulos</h2>
            <span className="small strong muted">{percent}% concluído</span>
          </div>
          <ProgressBar value={stats.completedLessons} max={stats.totalLessons} label="Progresso do curso" />
          {course.modules.length === 0 ? (
            <EmptyState title="Nenhum módulo ainda">
              <p className="muted">Crie o primeiro módulo e cole as aulas dele.</p>
            </EmptyState>
          ) : (
            course.modules.map((module) => (
              <ModuleRow
                key={module.id}
                module={module}
                nextLessonId={course.nextLesson?.id}
                defaultOpen={module.lessons.some((lesson) => lesson.id === course.nextLesson?.id)}
                onStudy={study}
                onToggle={(lesson) =>
                  run(() =>
                    api.updateLessonProgress(
                      user.id,
                      course.id,
                      module.id,
                      lesson.id,
                      lesson.progress === 'Completed' ? 'InProgress' : 'Completed',
                    ),
                  )
                }
                onAddLessons={(titles) => run(() => api.createLessons(user.id, course.id, module.id, titles))}
              />
            ))
          )}
          <AddModule onAdd={(title) => run(() => api.createModule(user.id, course.id, title))} />
        </section>

        <div className="grow-1 stack">
          <NextLessonCard course={course} onStudy={study} />
          <RecentNotes course={course} />
          <WeeklyGoalForm
            key={course.weeklyGoalMinutes ?? 'none'}
            current={course.weeklyGoalMinutes}
            onSave={(minutes) => run(() => api.setCourseWeeklyGoal(user.id, course.id, minutes))}
          />
        </div>
      </div>
    </div>
  )
}

function ModuleRow({
  module,
  nextLessonId,
  defaultOpen,
  onStudy,
  onToggle,
  onAddLessons,
}: {
  module: CourseModule
  nextLessonId?: number
  defaultOpen: boolean
  onStudy: (lessonId: number) => void
  onToggle: (lesson: Lesson) => void
  onAddLessons: (titles: string[]) => Promise<void>
}) {
  const [open, setOpen] = useState(defaultOpen)
  const done = module.lessons.filter((lesson) => lesson.progress === 'Completed').length
  const total = module.lessons.length
  const state = total > 0 && done === total ? 'done' : done > 0 || module.lessons.some((l) => l.progress === 'InProgress') ? 'doing' : 'todo'

  return (
    <div className={`module-row module-${state} ${open ? 'module-open' : ''}`}>
      <button type="button" className="module-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <ModuleIcon state={state} />
        <span className="grow strong module-title">
          {module.position}. {module.title}
        </span>
        <span className="small strong muted">
          {done} de {total}
        </span>
      </button>
      {open && (
        <div className="module-body">
          {module.lessons.map((lesson) => (
            <div key={lesson.id} className={`lesson-row lesson-${lesson.progress}`}>
              <button
                type="button"
                className="lesson-dot"
                aria-label={lesson.progress === 'Completed' ? `Desmarcar ${lesson.title}` : `Marcar ${lesson.title} como concluída`}
                onClick={() => onToggle(lesson)}
              >
                <LessonIcon progress={lesson.progress} />
              </button>
              <span className="grow lesson-title">{lesson.title}</span>
              {lesson.sessions > 0 && (
                <span className="small strong muted nowrap">
                  {lesson.sessions} {lesson.sessions === 1 ? 'sessão' : 'sessões'}
                </span>
              )}
              {lesson.progress !== 'Completed' && (
                <button
                  type="button"
                  className={`btn btn-sm ${lesson.id === nextLessonId ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => onStudy(lesson.id)}
                >
                  Estudar
                </button>
              )}
            </div>
          ))}
          <PasteLessons onAdd={onAddLessons} />
        </div>
      )}
    </div>
  )
}

function ModuleIcon({ state }: { state: 'done' | 'doing' | 'todo' }) {
  if (state === 'done')
    return (
      <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="13" fill="#4F9A80" />
        <path d="M8 14.5 L12 18.5 L20 10" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (state === 'doing')
    return (
      <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="12" fill="#FFFFFF" stroke="#4F9A80" strokeWidth="3" />
        <path d="M14 2 A12 12 0 0 1 26 14 L14 14 Z" fill="#4F9A80" />
      </svg>
    )
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28">
      <circle cx="14" cy="14" r="12" fill="none" stroke="#BFDCCD" strokeWidth="3" />
    </svg>
  )
}

function LessonIcon({ progress }: { progress: Lesson['progress'] }) {
  if (progress === 'Completed')
    return (
      <svg aria-hidden="true" viewBox="0 0 22 22" width="22" height="22">
        <circle cx="11" cy="11" r="10" fill="#8CCB9B" />
        <path d="M6.5 11.5 L9.5 14.5 L15.5 8" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (progress === 'InProgress')
    return (
      <svg aria-hidden="true" viewBox="0 0 22 22" width="22" height="22">
        <circle cx="11" cy="11" r="9" fill="#FFFFFF" stroke="#4F9A80" strokeWidth="2.5" />
        <circle cx="11" cy="11" r="4" fill="#4F9A80" />
      </svg>
    )
  return (
    <svg aria-hidden="true" viewBox="0 0 22 22" width="22" height="22">
      <circle cx="11" cy="11" r="9" fill="none" stroke="#BFDCCD" strokeWidth="2.5" />
    </svg>
  )
}

function PasteLessons({ onAdd }: { onAdd: (titles: string[]) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const titles = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!titles.length) return
    setBusy(true)
    await onAdd(titles)
    setBusy(false)
    setText('')
  }

  return (
    <form className="paste-lessons" onSubmit={handleSubmit}>
      <textarea
        aria-label="Novas aulas, uma por linha"
        rows={titles.length > 1 ? 4 : 1}
        placeholder="Nova aula (ou cole várias, uma por linha)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || !titles.length}>
        {titles.length > 1 ? `Adicionar ${titles.length} aulas` : 'Adicionar aula'}
      </button>
    </form>
  )
}

function AddModule({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" className="btn btn-dashed align-self-start" onClick={() => setOpen(true)}>
        Adicionar módulo
      </button>
    )
  }

  return (
    <form
      className="inline-add"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!title.trim()) return
        await onAdd(title.trim())
        setTitle('')
        setOpen(false)
      }}
    >
      <input aria-label="Nome do módulo" placeholder="Nome do módulo" maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
        Criar
      </button>
    </form>
  )
}

function NextLessonCard({ course, onStudy }: { course: CourseDetail; onStudy: (lessonId?: number) => void }) {
  const user = useUser()
  const progress = characterFormProgress(user.character)
  return (
    <section className="card card-mint center-text">
      <Pet stage={progress.stage.number} size={170} />
      <span className="small strong muted">Próxima aula</span>
      <span className="card-title-sm">{course.nextLesson?.title ?? 'Curso concluído!'}</span>
      <span className="small muted">Uma sessão de 25 min rende cerca de 200 Exp.</span>
      {course.nextLesson && (
        <button type="button" className="btn btn-primary" onClick={() => onStudy(course.nextLesson!.id)}>
          Estudar esta aula
        </button>
      )}
    </section>
  )
}

function RecentNotes({ course }: { course: CourseDetail }) {
  return (
    <section className="card stack-sm">
      <h2 className="card-title-sm">Últimos registros</h2>
      {course.recentNotes.length === 0 ? (
        <p className="small muted">Nenhum registro ainda. Depois de estudar, anote o que aprendeu.</p>
      ) : (
        course.recentNotes.map((note) => (
          <div key={note.id} className="note-mini">
            <span className="small strong muted">
              {dayFormat.format(new Date(note.createdAt))} · {MOOD_LABELS[note.mood]}
            </span>
            <p>{note.text}</p>
          </div>
        ))
      )}
      <Link to="/registros" state={{ courseId: course.id }} className="strong small">
        Ver todos os registros
      </Link>
    </section>
  )
}

function WeeklyGoalForm({ current, onSave }: { current: number | null; onSave: (minutes: number | null) => Promise<void> }) {
  const [hours, setHours] = useState(current ? String(current / 60) : '')
  const [busy, setBusy] = useState(false)
  const parsed = hours.trim() === '' ? null : Math.round(Number(hours.replace(',', '.')) * 60)
  const invalid = parsed !== null && (!Number.isFinite(parsed) || parsed < 10 || parsed > 3000)

  return (
    <form
      className="card stack-sm"
      onSubmit={async (event) => {
        event.preventDefault()
        if (invalid) return
        setBusy(true)
        await onSave(parsed)
        setBusy(false)
      }}
    >
      <h2 className="card-title-sm">Meta da semana</h2>
      <div className="inline-add">
        <input
          aria-label="Meta da semana em horas"
          inputMode="decimal"
          placeholder="Horas por semana"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          aria-invalid={invalid}
        />
        <button type="submit" className="btn btn-ghost" disabled={busy || invalid || parsed === current}>
          Salvar
        </button>
      </div>
      <span className="small muted">
        {invalid ? 'Use entre 10 min e 50 h.' : current ? `Atual: ${formatHours(current)} por semana` : 'Aparece no Início.'}
      </span>
    </form>
  )
}
