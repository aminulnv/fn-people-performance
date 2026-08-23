import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  fetchAuthSession,
  signInWithEmailPassword as apiSignInWithEmailPassword,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
} from '@/lib/authApi'
import { loadEmployees } from '@/lib/employees/store'
import { fetchGoalsSnapshot } from '@/lib/goalsApi'
import { setActivePerson, setSignedInPerson } from '@/lib/goals/store'
import { ensureReviewCyclesLoaded } from '@/lib/reviews/store'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'

function syncGoalsPersona(personId: string | undefined) {
  if (!personId || personId === 'local') return
  setSignedInPerson(personId)
  setActivePerson(personId)
}

async function hydratePlatformCaches() {
  await Promise.all([
    loadEmployees().catch(() => {
      /* load error surfaced via store subscribers */
    }),
    ensureReviewCyclesLoaded().catch(() => {
      /* reviews stay empty until retry; Goals falls back gracefully */
    }),
  ])
  void fetchGoalsSnapshot().catch(() => {
    /* Goals surfaces retry via useSharedGoalsSnapshot */
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const next = await fetchAuthSession()
        if (cancelled) return
        setSession(next)
        if (next) {
          syncGoalsPersona(next.user.personId)
          void hydratePlatformCaches()
        }
      } catch {
        if (!cancelled) setSession(null)
      } finally {
        if (!cancelled) setBootstrapped(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    syncGoalsPersona(session?.user.personId)
  }, [session?.user.personId])

  const signInWithGoogle = useCallback(async () => {
    const next = await apiSignInWithGoogle()
    syncGoalsPersona(next.user.personId)
    setSession(next)
    void hydratePlatformCaches()
  }, [])

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      const next = await apiSignInWithEmailPassword(email, password)
      syncGoalsPersona(next.user.personId)
      setSession(next)
      void hydratePlatformCaches()
    },
    [],
  )

  const signOut = useCallback(async () => {
    await apiSignOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    if (!bootstrapped) {
      return {
        status: 'loading',
        user: null,
        session: null,
        signInWithGoogle,
        signInWithEmailPassword,
        signOut,
      }
    }
    return {
      status: session ? 'authenticated' : 'anonymous',
      user: session?.user ?? null,
      session,
      signInWithGoogle,
      signInWithEmailPassword,
      signOut,
    }
  }, [
    bootstrapped,
    session,
    signInWithGoogle,
    signInWithEmailPassword,
    signOut,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
