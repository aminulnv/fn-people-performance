import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/lib/authApi'

export type AuthStatus = 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
  signInWithGoogle: () => Promise<void>
  signInWithDemoAccount: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
