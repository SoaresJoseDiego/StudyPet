import { Link } from 'react-router'
import { api } from '../api/client'
import { Slime } from '../components/Slime'
import { ErrorBox } from '../components/ui'
import { numberFormat } from '../format'
import { useUser } from '../session-context'
import { SLIMES, SLIME_KINDS } from '../slimes'
import { useAsync } from '../useAsync'

// Tela "Web · Bestiário" do design. Slimes ainda não encontrados aparecem como silhueta.
export function BestiaryPage() {
  const user = useUser()
  const { data: stats, error, reload } = useAsync(() => api.getStats(user.id), [user.id])

  return (
    <div className="page">
      <div className="page-header">
        <div className="stack-xs">
          <h1 className="page-title">Bestiário</h1>
          <p className="page-subtitle">Os slimes que aparecem pela cerca enquanto você estuda.</p>
        </div>
        <Link to="/exp" className="btn btn-ghost">
          Ver sistema de Exp
        </Link>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="grid-cards">
        {SLIME_KINDS.map((kind) => {
          const info = SLIMES[kind]
          const defeated = stats?.bestiary.find((entry) => entry.kind === kind)?.defeated ?? 0
          const found = defeated > 0
          const isKing = kind === 'Rei'
          return (
            <article key={kind} className={`card stack beast-card ${isKing ? 'beast-king' : ''}`}>
              <div className="beast-art">
                <Slime kind={kind} size={isKing ? 150 : 130} locked={stats !== undefined && !found} />
              </div>
              <div className="row-between">
                <h2 className="card-title">{info.name}</h2>
                <span className={`tag rarity-${kind}`}>{info.rarity}</span>
              </div>
              <p className="muted">{info.description}</p>
              <div className="row-between strong beast-footer">
                <span>+{info.experience} Exp</span>
                <span className="muted">
                  {stats === undefined
                    ? '…'
                    : found
                      ? `${numberFormat.format(defeated)} ${defeated === 1 ? 'derrotado' : 'derrotados'}`
                      : 'Ainda não encontrado'}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
