import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, type CourseStatusFilter } from '../api/client'
import type { CourseSummary } from '../api/types'
import { ErrorBox, Loading, ProgressBar } from '../components/ui'
import { CATEGORY_LABELS, COURSE_COLORS, formatHours } from '../format'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'
import type { StudyLocationState } from './StudyPage'

// Tela "Web · Meus cursos" do design.
export function CoursesPage() {
  const user = useUser()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<CourseStatusFilter>('andamento')
  const { data, error, loading, reload } = useAsync(() => api.listCourses(user.id, filter), [user.id, filter])

  const filters: { key: CourseStatusFilter; label: string; count?: number }[] = [
    { key: 'andamento', label: 'Em andamento', count: data?.counts.inProgress },
    { key: 'concluidos', label: 'Concluídos', count: data?.counts.completed },
    { key: 'todos', label: 'Todos', count: data?.counts.all },
    { key: 'arquivados', label: 'Arquivados', count: data?.counts.archived },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="stack-xs">
          <h1 className="page-title">Meus cursos</h1>
          <p className="page-subtitle">Os cursos que você já faz, organizados em módulos e aulas.</p>
        </div>
        <Link to="/cursos/novo" className="btn btn-primary btn-lg">
          <PlusIcon /> Adicionar curso
        </Link>
      </div>

      <div role="group" aria-label="Filtrar cursos" className="filter-row">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            className={`pill ${filter === item.key ? 'pill-active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            {item.count !== undefined && ` · ${item.count}`}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <div className="course-grid">
          {data?.items.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onStudy={() => {
                const state: StudyLocationState = { courseId: course.id, lessonId: course.nextLesson?.id }
                navigate('/estudar', { state })
              }}
            />
          ))}
          <Link to="/cursos/novo" className="course-add">
            <svg aria-hidden="true" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="#4F9A80" strokeWidth="3" strokeLinecap="round">
              <circle cx="24" cy="24" r="20" />
              <path d="M24 15 V33 M15 24 H33" />
            </svg>
            <span className="card-title">Adicionar um curso</span>
            <span className="muted small center-copy">Faculdade, cursinho, curso online ou um livro que você está estudando.</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function CourseCard({ course, onStudy }: { course: CourseSummary; onStudy: () => void }) {
  const color = COURSE_COLORS[course.color] ?? COURSE_COLORS.verde
  return (
    <article className="course-tile">
      <div className="course-stripe" style={{ background: color.stripe }} />
      <div className="course-tile-body">
        <div className="row wrap">
          <span className="tag" style={{ background: color.tint }}>
            {CATEGORY_LABELS[course.category]}
          </span>
          {course.isCompleted && <span className="tag tag-done">Concluído</span>}
          {course.isArchived && <span className="tag">Arquivado</span>}
        </div>
        <h2 className="course-tile-title">{course.title}</h2>
        {(course.instructor || course.provider) && (
          <p className="small muted">{[course.instructor, course.provider].filter(Boolean).join(' · ')}</p>
        )}
        <div className="stack-sm">
          <ProgressBar value={course.completedLessons} max={course.totalLessons} label={`Progresso em ${course.title}`} />
          <div className="row-between small strong">
            <span>
              {course.completedLessons} de {course.totalLessons} aulas
            </span>
            <span className="muted">{formatHours(course.focusMinutes)} estudadas</span>
          </div>
        </div>
        <p className="small muted">
          {course.nextLesson
            ? `Próxima: ${course.nextLesson.title}`
            : course.totalLessons
              ? 'Todas as aulas concluídas'
              : 'Nenhuma aula cadastrada'}
        </p>
        <div className="row course-tile-actions">
          <button type="button" className="btn btn-primary grow" onClick={onStudy} disabled={!course.totalLessons}>
            Estudar
          </button>
          <Link to={`/cursos/${course.id}`} className="btn btn-ghost grow">
            Ver curso
          </Link>
        </div>
      </div>
    </article>
  )
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 5 V19 M5 12 H19" />
    </svg>
  )
}
