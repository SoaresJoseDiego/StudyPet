import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { numberFormat } from '../format'
import { characterFormProgress } from '../progression'
import { useSession, useUser } from '../session-context'
import { FormProgressBar } from './ui'

// Menu lateral do design "Pet de Estudos" (Sidebar.dc.html), com Cursos e Ajustes do app.
const icon = (path: ReactNode) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
)

const links = [
  { to: '/', label: 'Início', end: true, icon: icon(<path d="M3 11 L12 4 L21 11 V20 H14 V14 H10 V20 H3 Z" />) },
  {
    to: '/estudar',
    label: 'Estudar',
    end: false,
    icon: icon(
      <>
        <path d="M14 4 H20 V10 L10 20 L4 14 Z" />
        <path d="M7 17 L3 21" />
      </>,
    ),
  },
  {
    to: '/cursos',
    label: 'Cursos',
    end: false,
    icon: icon(
      <>
        <path d="M2 9 L12 4 L22 9 L12 14 Z" />
        <path d="M6 11 V16 C8 18.5 16 18.5 18 16 V11" />
      </>,
    ),
  },
  {
    to: '/registros',
    label: 'Registros',
    end: false,
    icon: icon(
      <>
        <path d="M4 20 H8 L19 9 L15 5 L4 16 Z" />
        <path d="M13 7 L17 11" />
      </>,
    ),
  },
  {
    to: '/pet',
    label: 'Meu pet',
    end: false,
    icon: icon(
      <>
        <path d="M12 21 V11" />
        <path d="M12 12 C8 4 3 6 3 9 C5 13 9 14 12 12 Z M12 12 C16 4 21 6 21 9 C19 13 15 14 12 12 Z" />
      </>,
    ),
  },
  {
    to: '/conquistas',
    label: 'Conquistas',
    end: false,
    icon: icon(
      <>
        <circle cx="12" cy="15" r="5" />
        <path d="M8 3 L10.5 10 M16 3 L13.5 10" />
      </>,
    ),
  },
  { to: '/historico', label: 'Histórico', end: false, icon: icon(<path d="M4 20 V12 M10 20 V6 M16 20 V10 M22 20 H2" />) },
  {
    to: '/bestiario',
    label: 'Bestiário',
    end: false,
    icon: icon(
      <>
        <path d="M4 5 C7 4 10 4 12 6 C14 4 17 4 20 5 V19 C17 18 14 18 12 20 C10 18 7 18 4 19 Z" />
        <path d="M12 6 V20" />
      </>,
    ),
  },
  {
    to: '/exp',
    label: 'Sistema de Exp',
    end: false,
    icon: icon(<path d="M4 20 V16 M9 20 V12 M14 20 V8 M19 20 V4" />),
  },
  {
    to: '/ajustes',
    label: 'Ajustes',
    end: false,
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" />
      </>,
    ),
  },
]

export function Layout() {
  const user = useUser()
  const { signOut } = useSession()
  const character = user.character
  const progress = characterFormProgress(character)

  return (
    <div className="shell">
      <aside className="sidebar">
        <nav aria-label="Menu principal" className="sidebar-inner">
          <NavLink to="/" className="brand">
            <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32">
              <path d="M16 28 V14" stroke="#4F9A80" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path
                d="M16 16 C10 6 3 8 2 12 C6 18 12 19 16 16 Z M16 16 C22 6 29 8 30 12 C26 18 20 19 16 16 Z"
                fill="#8CCB9B"
                stroke="#4F9A80"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span>StudyPet</span>
          </NavLink>

          <div className="side-links">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className="side-link">
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          {character && (
            <NavLink to="/pet" className="side-pet">
              <div className="row-between">
                <span className="side-pet-stage">{progress.stage.name}</span>
                <span className="small strong">Nível {character.level}</span>
              </div>
              <FormProgressBar percent={progress.percent} label={`Progresso até ${progress.next?.name ?? 'forma final'}`} />
              <span className="small strong muted">
                {progress.next
                  ? `${numberFormat.format(progress.experienceToNext)} Exp até ${progress.next.name}`
                  : 'Forma final'}
              </span>
            </NavLink>
          )}

          <div className="side-user">
            <span className="small muted truncate">{user.displayName}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
              Sair
            </button>
          </div>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
