import { describe, expect, it } from 'vitest'
import { nameInitials } from '@/layout/utils'
import {
  DEFAULT_SIDEBAR_MODE,
  applySidebarExpanded,
  applySidebarMode,
  readSidebarPrefs,
} from '@/lib/sidebarPrefs'

const store = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  },
  configurable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: () => true,
  },
  configurable: true,
})

describe('nameInitials', () => {
  it('uses first and last word initials', () => {
    expect(nameInitials('Demo User')).toBe('DU')
  })

  it('uses up to two characters for a single word', () => {
    expect(nameInitials('Ada')).toBe('AD')
  })

  it('falls back for empty names', () => {
    expect(nameInitials('')).toBe('?')
    expect(nameInitials(null)).toBe('?')
  })
})

describe('sidebarPrefs', () => {
  it('defaults to auto mode', () => {
    store.clear()
    expect(readSidebarPrefs()).toEqual({
      mode: DEFAULT_SIDEBAR_MODE,
      expanded: false,
    })
  })

  it('persists manual expand mode', () => {
    store.clear()
    applySidebarMode('manual')
    applySidebarExpanded(true)
    expect(readSidebarPrefs()).toEqual({ mode: 'manual', expanded: true })
  })
})
