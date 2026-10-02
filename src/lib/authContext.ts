import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/lib/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  /** Effective identity (impersonation target when active). */
  user: AuthUser | null
  /**
   * Real signed-in admin. Same as `user` when not impersonating.
   * Use this for admin-only chrome (profile switcher).
   */
  actor: AuthUser | null
  isImpersonating: boolean
  session: AuthSession | null
  signInWithGoogle: () => Promise<void>
  signInWithEmailPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  startImpersonation: (employeeId: number) => Promise<void>
  stopImpersonation: () => Promise<void>
}

export const AuthContext = createContext(null as AuthContextValue | null)
