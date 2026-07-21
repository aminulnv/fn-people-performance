import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  readSession,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
} from '@/lib/authApi'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  const signInWithGoogle = useCallback(async () => {
    const next = await apiSignInWithGoogle()
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session ? 'authenticated' : 'anonymous',
      user: session?.user ?? null,
      session,
      signInWithGoogle,
      signOut,
    }),
    [session, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
