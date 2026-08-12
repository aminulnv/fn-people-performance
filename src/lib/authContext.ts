import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/lib/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
  signInWithGoogle: () => Promise<void>
  signInWithEmailPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext(null as AuthContextValue | null)
