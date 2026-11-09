import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../api/client'
import type { CourseCategory, CourseColor } from '../api/types'
import { ErrorBox } from '../components/ui'
import { CATEGORY_LABELS, COURSE_COLORS } from '../format'
import { useUser } from '../session-context'

interface DraftModule {
  id: number
  title: string
  lessons: string
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CourseCategory[]
const COLORS = Object.keys(COURSE_COLORS) as CourseColor[]

/** Uma aula por linha; remove numeração colada da plataforma ("1. ", "Aula 3 - ", durações "12:34"). */
function parseLessons(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(\d+[.)-]\s*|aula\s+\d+\s*[-:.]?\s*)/i, '')
        .replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*$/, '')
        .replace(/\s+\d+\s*min\s*$/i, '')
        .trim(),
    )
    .filter((line) => line.length > 0)
}

// Cadastro de curso: manual, com atalho de colar o link da Udemy e de colar as aulas de uma vez.
export function NewCoursePage() {
  const user = useUser()
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [linkInfo, setLinkInfo] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<CourseCategory>('CursoOnline')
  const [color, setColor] = useState<CourseColor>('verde')
  const [instructor, setInstructor] = useState('')
  const [provider, setProvider] = useState('')
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [goalHours, setGoalHours] = useState('')
  const [modules, setModules] = useState<DraftModule[]>([{ id: 1, title: 'Módulo 1', lessons: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fillFromLink() {
    setLinkInfo(null)
    setError(null)
    try {
      const preview = await api.udemyPreview(link)
      setTitle(preview.title)
      setProvider(preview.provider)
      setSourceUrl(preview.url)
      setCategory('CursoOnline')
      if (preview.instructor) setInstructor(preview.instructor)
      setLinkInfo(
        preview.fromPage
          ? 'Dados preenchidos a partir da página do curso.'
          : 'A Udemy não deixa ler a página automaticamente, então usei o título do próprio link. Confira e complete o instrutor.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    }
  }

  function updateModule(id: number, patch: Partial<DraftModule>) {
    setModules((current) => current.map((module) => (module.id === id ? { ...module, ...patch } : module)))
  }

  const lessonCount = modules.reduce((total, module) => total + parseLessons(module.lessons).length, 0)
  const goalMinutes = goalHours.trim() ? Math.round(Number(goalHours.replace(',', '.')) * 60) : null
  const goalInvalid = goalMinutes !== null && (!Number.isFinite(goalMinutes) || goalMinutes < 10 || goalMinutes > 3000)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (goalInvalid) return
    setBusy(true)
    setError(null)
    try {
      const created = await api.createCourse(user.id, {
        title,
        category,
        color,
        instructor: instructor || null,
        provider: provider || null,
        sourceUrl,
        weeklyGoalMinutes: goalMinutes,
        modules: modules
          .filter((module) => module.title.trim())
          .map((module) => ({ title: module.title, lessons: parseLessons(module.lessons) })),
      })
      navigate(`/cursos/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  return (
    <div className="page page-narrow">
      <Link to="/cursos" className="back-link">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
        Meus cursos
      </Link>
      <div className="stack-xs">
        <h1 className="page-title">Adicionar curso</h1>
        <p className="page-subtitle">Cadastre o curso que você já faz, com os módulos e as aulas.</p>
      </div>

      <section className="card stack">
        <h2 className="card-title-sm">Veio da Udemy?</h2>
        <p className="small muted">
          A Udemy não oferece um jeito oficial de importar seus cursos. Cole o link e eu preencho o que der; depois
          copie a lista de aulas da página do curso e cole nos módulos abaixo.
        </p>
        <div className="inline-add">
          <input
            aria-label="Link do curso na Udemy"
            placeholder="https://www.udemy.com/course/nome-do-curso/"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" onClick={fillFromLink} disabled={!link.trim()}>
            Preencher
          </button>
        </div>
        {linkInfo && <p className="small success">{linkInfo}</p>}
      </section>

      <form className="stack-lg" onSubmit={handleSubmit}>
        <section className="card stack">
          <h2 className="card-title-sm">Sobre o curso</h2>
          <label className="field">
            <span>Título</span>
            <input required maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Instrutor ou professor (opcional)</span>
              <input maxLength={120} value={instructor} onChange={(e) => setInstructor(e.target.value)} />
            </label>
            <label className="field">
              <span>Plataforma ou escola (opcional)</span>
              <input maxLength={80} placeholder="Udemy, Alura, faculdade…" value={provider} onChange={(e) => setProvider(e.target.value)} />
            </label>
          </div>
          <div role="group" aria-label="Tipo" className="stack-sm">
            <span className="field-label">Tipo</span>
            <div className="filter-row">
              {CATEGORIES.map((key) => (
                <button key={key} type="button" aria-pressed={category === key} className={`pill ${category === key ? 'pill-active' : ''}`} onClick={() => setCategory(key)}>
                  {CATEGORY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Cor" className="stack-sm">
            <span className="field-label">Cor do card</span>
            <div className="filter-row">
              {COLORS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={color === key}
                  aria-label={COURSE_COLORS[key].label}
                  className={`swatch ${color === key ? 'swatch-active' : ''}`}
                  style={{ background: COURSE_COLORS[key].stripe }}
                  onClick={() => setColor(key)}
                />
              ))}
            </div>
          </div>
          <label className="field field-short">
            <span>Meta da semana em horas (opcional)</span>
            <input inputMode="decimal" placeholder="Ex.: 3" value={goalHours} onChange={(e) => setGoalHours(e.target.value)} aria-invalid={goalInvalid} />
          </label>
        </section>

        <section className="card stack">
          <div className="row-between">
            <h2 className="card-title-sm">Módulos e aulas</h2>
            <span className="small strong muted">{lessonCount} {lessonCount === 1 ? 'aula' : 'aulas'}</span>
          </div>
          <p className="small muted">Uma aula por linha. Números e durações colados da plataforma são removidos.</p>
          {modules.map((module, index) => (
            <div key={module.id} className="module-draft stack-sm">
              <div className="row">
                <input
                  aria-label={`Nome do módulo ${index + 1}`}
                  value={module.title}
                  maxLength={180}
                  onChange={(e) => updateModule(module.id, { title: e.target.value })}
                />
                {modules.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger-ghost btn-sm"
                    onClick={() => setModules((current) => current.filter((m) => m.id !== module.id))}
                  >
                    Remover
                  </button>
                )}
              </div>
              <textarea
                aria-label={`Aulas do módulo ${index + 1}`}
                rows={5}
                placeholder={'Ideia de limite\nLimites laterais\nContinuidade'}
                value={module.lessons}
                onChange={(e) => updateModule(module.id, { lessons: e.target.value })}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-dashed"
            onClick={() =>
              setModules((current) => [...current, { id: Date.now(), title: `Módulo ${current.length + 1}`, lessons: '' }])
            }
          >
            Adicionar módulo
          </button>
        </section>

        {error && <ErrorBox message={error} />}
        <div className="row wrap">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !title.trim() || goalInvalid}>
            {busy ? 'Salvando…' : 'Salvar curso'}
          </button>
          <Link to="/cursos" className="btn btn-ghost btn-lg">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
