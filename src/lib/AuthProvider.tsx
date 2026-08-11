import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  readSession,
  signInWithDemoAccount as apiSignInWithDemoAccount,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
} from '@/lib/authApi'
import { setActivePerson } from '@/lib/goals/store'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'

function syncGoalsPersona(personId: string | undefined) {
  if (!personId) return
  setActivePerson(personId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  useEffect(() => {
    syncGoalsPersona(session?.user.personId)
  }, [session?.user.personId])

  const signInWithGoogle = useCallback(async () => {
    const next = await apiSignInWithGoogle()
    syncGoalsPersona(next.user.personId)
    setSession(next)
  }, [])

  const signInWithDemoAccount = useCallback(async (email: string) => {
    const next = await apiSignInWithDemoAccount(email)
    syncGoalsPersona(next.user.personId)
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
      signInWithDemoAccount,
      signOut,
    }),
    [session, signInWithGoogle, signInWithDemoAccount, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
