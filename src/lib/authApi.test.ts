import { afterEach, describe, expect, it } from 'vitest'
import {
  LOCAL_USER,
  clearSession,
  getAccessToken,
  isSignedIn,
  readSession,
  signInWithGoogle,
  signOut,
  writeSession,
} from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'

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
  clearEmployees()
})

describe('authApi session', () => {
  it('starts signed out', () => {
    expect(isSignedIn()).toBe(false)
    expect(readSession()).toBeNull()
  })

  it('signs in with the local placeholder when the directory is empty', async () => {
    const session = await signInWithGoogle()
    expect(session.user).toEqual(LOCAL_USER)
    expect(isSignedIn()).toBe(true)
    expect(readSession()?.user.email).toBe(LOCAL_USER.email)
  })

  it('signs in as the first active employee when one exists', async () => {
    await createEmployee({
      employeeId: 101,
      fullName: 'Test Person',
      email: 'test.person@nextventures.io',
      startDate: '2026-01-01',
      jobTitle: 'Manager',
      department: 'Product',
      team: 'Core',
      division: 'FundedNext',
      reportsToName: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: 'M1',
      site: '',
      managerEmail: '',
    })

    const session = await signInWithGoogle()
    expect(session.user.email).toBe('test.person@nextventures.io')
    expect(session.user.personId).toBe('101')
    expect(session.user.role).toBe('manager')
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
    expect(session?.user).toEqual(LOCAL_USER)
    expect(sessionStorage.getItem('pd-demo-auth')).toBeNull()
    expect(sessionStorage.getItem('pd-auth-session')).toBeTruthy()
  })

  it('round-trips writeSession', () => {
    writeSession({
      user: LOCAL_USER,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(readSession()?.signedInAt).toBe('2026-01-01T00:00:00.000Z')
    clearSession()
    expect(readSession()).toBeNull()
  })

  it('exposes accessToken via getAccessToken', () => {
    writeSession({
      user: LOCAL_USER,
      signedInAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'tok',
    })
    expect(getAccessToken()).toBe('tok')
    clearSession()
    expect(getAccessToken()).toBeNull()
  })
})
