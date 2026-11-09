import type { ReactNode } from 'react'
import { api } from '../api/client'
import type { AchievementItem } from '../api/types'
import { ErrorBox, FormProgressBar, Loading } from '../components/ui'
import { useUser } from '../session-context'
import { useAsync } from '../useAsync'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

const ICONS: Record<AchievementItem['icon'], ReactNode> = {
  flame: <path d="M12 3 C14 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C10 9 11 10 12 10 C12 8 11 6 12 3 Z" />,
  crown: <path d="M3 18 L5 7 L10 12 L12 5 L14 12 L19 7 L21 18 Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 V12 L15.5 14" />
    </>
  ),
  leaf: (
    <>
      <path d="M12 21 V11" />
      <path d="M12 12 C8 4 3 6 3 9 C5 13 9 14 12 12 Z M12 12 C16 4 21 6 21 9 C19 13 15 14 12 12 Z" />
    </>
  ),
  book: (
    <>
      <path d="M4 5 C7 4 10 4 12 6 C14 4 17 4 20 5 V19 C17 18 14 18 12 20 C10 18 7 18 4 19 Z" />
      <path d="M12 6 V20" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20 H8 L19 9 L15 5 L4 16 Z" />
      <path d="M13 7 L17 11" />
    </>
  ),
}

// Tela "Web · Conquistas" do design.
export function AchievementsPage() {
  const user = useUser()
  const { data, error, loading, reload } = useAsync(() => api.getAchievements(user.id), [user.id])

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? 'Erro ao carregar.'} onRetry={reload} />

  return (
    <div className="page">
      <div className="page-header">
        <div className="stack-xs">
          <h1 className="page-title">Conquistas</h1>
          <p className="page-subtitle">Medalhas por constância, chefes, horas, evolução, cursos e registros.</p>
        </div>
        <div className="stat-card achievements-summary">
          <div className="row-between baseline">
            <span className="stat-value">
              {data.earnedCount} de {data.total}
            </span>
            {data.closest && <span className="small strong muted">Mais perto: {data.closest}</span>}
          </div>
          <FormProgressBar percent={Math.round((data.earnedCount / data.total) * 100)} label="Conquistas obtidas" />
        </div>
      </div>

      {data.groups.map((group) => (
        <section key={group.title} className="stack-sm">
          <h2 className="card-title-sm">{group.title}</h2>
          <div className="grid-medals">
            {group.items.map((item) => (
              <article key={item.key} className={`medal-card ${item.earned ? 'medal-earned' : 'medal-locked'}`}>
                <div className="medal">
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[item.icon]}
                  </svg>
                </div>
                <div className="stack-xs grow">
                  <span className="medal-name">{item.name}</span>
                  <span className="small muted">{item.description}</span>
                  {item.earned && item.earnedAt ? (
                    <span className="small strong success">Conquistada em {dateFormat.format(new Date(item.earnedAt))}</span>
                  ) : (
                    <div className="row medal-progress">
                      <FormProgressBar percent={Math.round((item.value / item.target) * 100)} label={`Progresso em ${item.name}`} />
                      <span className="small strong nowrap">
                        {item.metric === 'Level' ? 'nível ' : ''}
                        {item.value} de {item.target}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
