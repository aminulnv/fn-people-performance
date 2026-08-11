import {
  DEMO_ACCOUNTS,
  findDemoAccount,
  type DemoAccount,
} from '@/lib/demoAccounts'
import type { GoalRole } from '@/lib/goals/types'

export type AuthUser = {
  id: string
  email: string
  name: string
  personId: string
  role: GoalRole
  title: string
}

/** Default account used for legacy session migration. */
export const DEMO_USER: AuthUser = accountToUser(DEMO_ACCOUNTS[0])

const AUTH_SESSION_KEY = 'pd-auth-session'
const LEGACY_AUTH_KEY = 'pd-demo-auth'

export type AuthSession = {
  user: AuthUser
  /** ISO timestamp when the session was established. */
  signedInAt: string
  /**
   * Bearer token for API calls when the IdP returns one.
   * Prefer HttpOnly cookies in production; this field is for SPA token flows.
   */
  accessToken?: string
}

function accountToUser(account: DemoAccount): AuthUser {
  return {
    id: account.personId,
    email: account.email,
    name: account.name,
    personId: account.personId,
    role: account.role,
    title: account.title,
  }
}

function readRawSession(): string | null {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

function migrateLegacySession(): AuthSession | null {
  try {
    if (sessionStorage.getItem(LEGACY_AUTH_KEY) !== '1') return null
    const session: AuthSession = {
      user: DEMO_USER,
      signedInAt: new Date().toISOString(),
    }
    writeSession(session)
    sessionStorage.removeItem(LEGACY_AUTH_KEY)
    return session
  } catch {
    return null
  }
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const parsed = value as AuthSession
  const user = parsed.user
  return (
    !!user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    typeof user.personId === 'string' &&
    typeof user.role === 'string' &&
    typeof user.title === 'string' &&
    typeof parsed.signedInAt === 'string' &&
    (parsed.accessToken === undefined || typeof parsed.accessToken === 'string')
  )
}

export function readSession(): AuthSession | null {
  const raw = readRawSession()
  if (!raw) return migrateLegacySession()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (isValidSession(parsed)) return parsed
  } catch {
    /* migrate legacy flag stored under the new key */
  }
  if (raw === '1') {
    const session: AuthSession = {
      user: DEMO_USER,
      signedInAt: new Date().toISOString(),
    }
    writeSession(session)
    return session
  }
  return migrateLegacySession()
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null
}

export function isSignedIn(): boolean {
  return readSession() !== null
}

/** Sign in as a known @demo.com account (local / demo environments). */
export async function signInWithDemoAccount(
  email: string,
): Promise<AuthSession> {
  await Promise.resolve()
  const account = findDemoAccount(email)
  if (!account) {
    throw new Error('Unknown demo account.')
  }
  const session: AuthSession = {
    user: accountToUser(account),
    signedInAt: new Date().toISOString(),
  }
  writeSession(session)
  return session
}

/**
 * Demo Google sign-in. Currently maps to the default employee demo account.
 * Replace with a real OAuth redirect / token exchange for production.
 */
export async function signInWithGoogle(): Promise<AuthSession> {
  return signInWithDemoAccount(DEMO_USER.email)
}

export async function signOut(): Promise<void> {
  await Promise.resolve()
  clearSession()
}
