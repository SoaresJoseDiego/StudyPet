import { createContext, useContext } from 'react'
import type { AuthUser, User } from './api/types'

export interface SessionValue {
  user: User | null
  loading: boolean
  signIn: (auth: AuthUser) => void
  signOut: () => void
  refreshUser: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession precisa estar dentro de <SessionProvider>.')
  return value
}

/** Usuário garantido: use só em telas protegidas (dentro do <Layout>). */
export function useUser(): User {
  const { user } = useSession()
  if (!user) throw new Error('Nenhum usuário na sessão.')
  return user
}
