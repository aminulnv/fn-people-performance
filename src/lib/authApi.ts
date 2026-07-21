export const DEMO_USER = {
  id: 'demo',
  email: 'demo@example.com',
  name: 'Demo User',
} as const

const AUTH_SESSION_KEY = 'pd-demo-auth'

export function isSignedIn(): boolean {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === '1'
}

export function signIn(): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, '1')
}

export function signOut(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}
