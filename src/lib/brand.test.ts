import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_COLOR,
  getThemeBootstrapScript,
  normalizeThemeColor,
} from '@/lib/brand'

describe('normalizeThemeColor', () => {
  it('accepts lowercase hex with hash', () => {
    expect(normalizeThemeColor('#a1b2c3')).toBe('#a1b2c3')
  })

  it('normalizes uppercase hex', () => {
    expect(normalizeThemeColor('#AABBCC')).toBe('#aabbcc')
  })

  it('accepts hex without hash', () => {
    expect(normalizeThemeColor('473fee')).toBe('#473fee')
  })

  it('rejects invalid colors', () => {
    expect(normalizeThemeColor('blue')).toBeNull()
    expect(normalizeThemeColor('#fff')).toBeNull()
    expect(normalizeThemeColor('')).toBeNull()
  })
})

describe('getThemeBootstrapScript', () => {
  it('embeds theme storage keys and default appearance', () => {
    const script = getThemeBootstrapScript()
    expect(script).toContain('app-theme-color')
    expect(script).toContain('app-theme-mode')
    expect(script).toContain('app-appearance')
    expect(script).toContain('light')
    expect(script).toContain('--color-theme')
  })

  it('does not hardcode the default brand hex as a forced theme', () => {
    // Bootstrap only applies custom colors from storage; default comes from CSS.
    expect(getThemeBootstrapScript()).not.toContain(DEFAULT_THEME_COLOR)
  })
})
