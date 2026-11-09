import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ApiError, api } from './api/client'
import type { User } from './api/types'
import { SessionContext } from './session-context'

const STORAGE_KEY = 'studypet.userId'

/** Id numérico salvo no navegador. Ids antigos (Guid, antes da troca para int) são descartados. */
function readStoredUserId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && /^\d+$/.test(raw)) return Number(raw)
    if (raw) localStorage.removeItem(STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

function storeUserId(userId: number | null) {
  try {
    if (userId) localStorage.setItem(STORAGE_KEY, String(userId))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem localStorage (janela privada etc.): a sessão vale só até recarregar.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => readStoredUserId() !== null)

  const signIn = useCallback((next: User) => {
    storeUserId(next.id)
    setUser(next)
  }, [])

  const signOut = useCallback(() => {
    storeUserId(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const userId = readStoredUserId()
    if (!userId) return
    try {
      setUser(await api.getUser(userId))
    } catch (error) {
      // Conta apagada ou banco recriado: volta para a tela de entrada.
      if (error instanceof ApiError && error.status === 404) signOut()
      else throw error
    }
  }, [signOut])

  // Ao abrir o app, recarrega o usuário salvo no navegador.
  useEffect(() => {
    const userId = readStoredUserId()
    if (!userId) return
    let cancelled = false
    api
      .getUser(userId)
      .then((loaded) => {
        if (!cancelled) setUser(loaded)
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 404) signOut()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [signOut])

  return (
    <SessionContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </SessionContext.Provider>
  )
}
