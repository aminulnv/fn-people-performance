import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  getAccessToken,
  isSignedIn,
  readSession,
  signInWithGoogle,
  signOut,
  writeSession,
} from '@/lib/authApi'

const store = new Map<string, string>()

const memorySessionStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
  key: () => null,
  get length() {
    return store.size
  },
}

Object.defineProperty(globalThis, 'sessionStorage', {
  value: memorySessionStorage,
  configurable: true,
})

afterEach(() => {
  store.clear()
})

describe('authApi session', () => {
  it('starts signed out', () => {
    expect(isSignedIn()).toBe(false)
    expect(readSession()).toBeNull()
  })

  it('persists a Google demo session', async () => {
    const session = await signInWithGoogle()
    expect(session.user).toEqual(DEMO_USER)
    expect(isSignedIn()).toBe(true)
    expect(readSession()?.user.email).toBe(DEMO_USER.email)
  })

  it('clears session on sign out', async () => {
    await signInWithGoogle()
    await signOut()
    expect(isSignedIn()).toBe(false)
    expect(readSession()).toBeNull()
  })

  it('migrates the legacy demo flag', () => {
    sessionStorage.setItem('pd-demo-auth', '1')
    const session = readSession()
    expect(session?.user).toEqual(DEMO_USER)
    expect(sessionStorage.getItem('pd-demo-auth')).toBeNull()
    expect(sessionStorage.getItem('pd-auth-session')).toBeTruthy()
  })

  it('round-trips writeSession', () => {
    writeSession({
      user: DEMO_USER,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(readSession()?.signedInAt).toBe('2026-01-01T00:00:00.000Z')
    clearSession()
    expect(readSession()).toBeNull()
  })

  it('exposes accessToken via getAccessToken', () => {
    writeSession({
      user: DEMO_USER,
      signedInAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'tok',
    })
    expect(getAccessToken()).toBe('tok')
    clearSession()
    expect(getAccessToken()).toBeNull()
  })
})
