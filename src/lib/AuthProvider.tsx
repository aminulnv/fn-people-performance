import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  clearSession,
  fetchAuthSession,
  isImpersonatingSession,
  sessionActor,
  signInWithEmailPassword as apiSignInWithEmailPassword,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  startImpersonation as apiStartImpersonation,
  stopImpersonation as apiStopImpersonation,
} from '@/lib/authApi'
import { loadEmployees } from '@/lib/employees/store'
import { fetchGoalsSnapshot } from '@/lib/goalsApi'
import { setActivePerson, setSignedInPerson } from '@/lib/goals/store'
import { queryClient } from '@/lib/queryClient'
import { ensureReviewCyclesLoaded } from '@/lib/reviews/store'
import { ensureSkillsLoaded } from '@/lib/skills/store'
import { ensureRolesLoaded } from '@/lib/roles/store'
import { ensureValuesLoaded } from '@/lib/values/store'
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
    ensureSkillsLoaded().catch(() => {
      /* skills stay empty until retry */
    }),
    ensureRolesLoaded().catch(() => {
      /* roles stay empty until retry */
    }),
    ensureValuesLoaded().catch(() => {
      /* values stay empty until retry */
    }),
  ])
  void fetchGoalsSnapshot().catch(() => {
    /* Goals surfaces retry via useSharedGoalsSnapshot */
  })
}

function applySession(next: AuthSession | null) {
  syncGoalsPersona(next?.user.personId)
  queryClient.clear()
  if (next) void hydratePlatformCaches()
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
    const onUnauthorized = () => {
      clearSession()
      setSession(null)
    }
    window.addEventListener('platform-unauthorized', onUnauthorized)
    return () => {
      window.removeEventListener('platform-unauthorized', onUnauthorized)
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
    queryClient.clear()
    setSession(null)
  }, [])

  const startImpersonation = useCallback(async (employeeId: number) => {
    const next = await apiStartImpersonation(employeeId)
    applySession(next)
    setSession(next)
  }, [])

  const stopImpersonation = useCallback(async () => {
    const next = await apiStopImpersonation()
    applySession(next)
    setSession(next)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    if (!bootstrapped) {
      return {
        status: 'loading',
        user: null,
        actor: null,
        isImpersonating: false,
        session: null,
        signInWithGoogle,
        signInWithEmailPassword,
        signOut,
        startImpersonation,
        stopImpersonation,
      }
    }
    return {
      status: session ? 'authenticated' : 'anonymous',
      user: session?.user ?? null,
      actor: sessionActor(session),
      isImpersonating: isImpersonatingSession(session),
      session,
      signInWithGoogle,
      signInWithEmailPassword,
      signOut,
      startImpersonation,
      stopImpersonation,
    }
  }, [
    bootstrapped,
    session,
    signInWithGoogle,
    signInWithEmailPassword,
    signOut,
    startImpersonation,
    stopImpersonation,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
