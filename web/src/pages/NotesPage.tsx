import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { api } from '../api/client'
import type { StudyMood } from '../api/types'
import { ErrorBox, Loading } from '../components/ui'
import { COURSE_COLORS, MOOD_LABELS, MOOD_TINTS } from '../format'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'

/** Estado vindo da recompensa de uma sessão ou do detalhe do curso. */
export interface NotesLocationState {
  courseId?: number
  minutes?: number
  sessionId?: number
}

const TIMES = [15, 25, 50, 75]
const MOODS = Object.keys(MOOD_LABELS) as StudyMood[]
const whenFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function relativeWhen(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Hoje, ${time}`
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${time}`
  return whenFormat.format(date)
}

// Tela "Web · Registro de estudos" do design: o diário do que foi aprendido e onde travou.
export function NotesPage() {
  const user = useUser()
  const location = useLocation()
  const incoming = (location.state as NotesLocationState | null) ?? null
  const [filter, setFilter] = useState<number | 'todos'>(incoming?.courseId && !incoming.sessionId ? incoming.courseId : 'todos')

  const courses = useAsync(() => api.listCourses(user.id, 'todos'), [user.id])
  const notes = useAsync(() => api.listNotes(user.id, filter === 'todos' ? undefined : filter), [user.id, filter])

  return (
    <div className="page">
      <div className="stack-xs">
        <h1 className="page-title">Registro de estudos</h1>
        <p className="page-subtitle">Seu diário: anote o que aprendeu e onde travou depois de cada sessão.</p>
      </div>

      <div className="split align-start">
        {courses.data && courses.data.items.length === 0 ? (
          <section className="card grow-1 stack">
            <h2 className="card-title">Novo registro</h2>
            <p className="muted">Adicione um curso para começar seu diário.</p>
            <Link to="/cursos/novo" className="btn btn-primary">
              Adicionar curso
            </Link>
          </section>
        ) : (
          courses.data && (
            <NoteForm
              key={incoming?.sessionId ?? 'new'}
              courses={courses.data.items.map((course) => ({ id: course.id, title: course.title }))}
              initial={incoming}
              onSaved={() => {
                setFilter('todos')
                notes.reload()
              }}
            />
          )
        )}

        <section className="grow-2 stack">
          <div className="row-between wrap">
            <h2 className="card-title">
              {notes.data ? `${notes.data.total} ${notes.data.total === 1 ? 'registro' : 'registros'}` : 'Registros'}
            </h2>
            <div role="group" aria-label="Filtrar por curso" className="filter-row">
              <button type="button" aria-pressed={filter === 'todos'} className={`pill ${filter === 'todos' ? 'pill-active' : ''}`} onClick={() => setFilter('todos')}>
                Todos
              </button>
              {courses.data?.items.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  aria-pressed={filter === course.id}
                  className={`pill ${filter === course.id ? 'pill-active' : ''}`}
                  onClick={() => setFilter(course.id)}
                >
                  {course.title}
                </button>
              ))}
            </div>
          </div>

          {notes.loading && !notes.data ? (
            <Loading />
          ) : notes.error ? (
            <ErrorBox message={notes.error} onRetry={notes.reload} />
          ) : notes.data && notes.data.items.length === 0 ? (
            <p className="empty muted">{filter === 'todos' ? 'Nenhum registro ainda.' : 'Nenhum registro deste curso ainda.'}</p>
          ) : (
            notes.data?.items.map((note) => (
              <article key={note.id} className="card note-card">
                <div className="row wrap">
                  <span className="tag" style={{ background: (COURSE_COLORS[note.courseColor] ?? COURSE_COLORS.verde).tint }}>
                    {note.courseTitle}
                  </span>
                  <span className="small strong muted">
                    {relativeWhen(note.createdAt)}
                    {note.minutes > 0 && ` · ${note.minutes} min`}
                  </span>
                  <span className="tag" style={{ background: MOOD_TINTS[note.mood] }}>
                    {MOOD_LABELS[note.mood]}
                  </span>
                </div>
                <p className="note-text">{note.text}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function NoteForm({
  courses,
  initial,
  onSaved,
}: {
  courses: { id: number; title: string }[]
  initial: NotesLocationState | null
  onSaved: () => void
}) {
  const user = useUser()
  const [courseId, setCourseId] = useState(initial?.courseId ?? courses[0].id)
  const [minutes, setMinutes] = useState(initial?.minutes ?? 25)
  const [text, setText] = useState('')
  const [mood, setMood] = useState<StudyMood>('Ok')
  const [sessionId, setSessionId] = useState(initial?.sessionId ?? null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const times = TIMES.includes(minutes) ? TIMES : [...TIMES, minutes].sort((a, b) => a - b)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const saved = await api.createNote(user.id, { courseId, minutes, mood, text, studySessionId: sessionId })
      const course = courses.find((c) => c.id === courseId)?.title
      setStatus(
        saved.newAchievements.length
          ? `Registro salvo! Conquista desbloqueada: ${saved.newAchievements.map((a) => a.name).join(', ')}.`
          : `Registro salvo no diário de ${course}.`,
      )
      setText('')
      setSessionId(null)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card grow-1 stack" onSubmit={handleSubmit}>
      <h2 className="card-title">Novo registro</h2>
      {sessionId && <p className="small success">Sobre a sessão que você acabou de concluir.</p>}
      <div className="grid-2-tight">
        <label className="field">
          <span>Curso</span>
          <select value={courseId} onChange={(e) => setCourseId(Number(e.target.value))}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tempo</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {times.map((time) => (
              <option key={time} value={time}>
                {time} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>O que você estudou?</span>
        <textarea
          rows={5}
          maxLength={2000}
          placeholder="O que aprendeu, onde travou, o que revisar depois"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div role="group" aria-label="Como foi" className="stack-sm">
        <span className="field-label">Como foi?</span>
        <div className="row">
          {MOODS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={mood === key}
              className={`pill grow ${mood === key ? 'pill-mood-active' : ''}`}
              style={mood === key ? { background: MOOD_TINTS[key] } : undefined}
              onClick={() => setMood(key)}
            >
              {MOOD_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorBox message={error} />}
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !text.trim()}>
        {busy ? 'Salvando…' : 'Salvar registro'}
      </button>
      <p role="status" className="small success status-line">
        {status}
      </p>
    </form>
  )
}
