export type AuthUser = {
  id: string
  email: string
  name: string
}

export const DEMO_USER: AuthUser = {
  id: 'demo',
  email: 'demo@example.com',
  name: 'Demo User',
}

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
  return (
    !!parsed.user &&
    typeof parsed.user.id === 'string' &&
    typeof parsed.user.email === 'string' &&
    typeof parsed.user.name === 'string' &&
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

/**
 * Demo Google sign-in. Replace the body with a real OAuth redirect / token
 * exchange when wiring a production identity provider. Persist `accessToken`
 * on the returned session so `apiFetch` can attach Authorization.
 */
export async function signInWithGoogle(): Promise<AuthSession> {
  await Promise.resolve()
  const session: AuthSession = {
    user: DEMO_USER,
    signedInAt: new Date().toISOString(),
  }
  writeSession(session)
  return session
}

export async function signOut(): Promise<void> {
  await Promise.resolve()
  clearSession()
}
