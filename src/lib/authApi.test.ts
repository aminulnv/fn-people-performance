import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  getAccessToken,
  isSignedIn,
  readSession,
  signInWithDemoAccount,
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

  it('persists a demo account session', async () => {
    const session = await signInWithDemoAccount('manager@demo.com')
    expect(session.user.email).toBe('manager@demo.com')
    expect(session.user.role).toBe('manager')
    expect(session.user.personId).toBe('manager')
    expect(isSignedIn()).toBe(true)
    expect(readSession()?.user.email).toBe('manager@demo.com')
  })

  it('rejects unknown demo accounts', async () => {
    await expect(signInWithDemoAccount('nobody@demo.com')).rejects.toThrow(
      /unknown demo account/i,
    )
    expect(isSignedIn()).toBe(false)
  })

  it('clears session on sign out', async () => {
    await signInWithDemoAccount('employee@demo.com')
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
