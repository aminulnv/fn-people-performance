import { describe, expect, it } from 'vitest'
import {
  hashForSettingsSection,
  settingsSectionFromHash,
  settingsSectionFromQuery,
} from './sectionHashes'

describe('settingsSectionFromHash', () => {
  it('maps settings section hashes', () => {
    expect(settingsSectionFromHash('#appearance')).toBe('appearance')
    expect(settingsSectionFromHash('#assistant')).toBe('assistant')
    expect(settingsSectionFromHash('#access')).toBe('access')
    expect(settingsSectionFromHash('#activity')).toBe('activity')
    expect(settingsSectionFromHash('#about')).toBe('about')
  })

  it('returns null for unknown hashes', () => {
    expect(settingsSectionFromHash('#everyone')).toBeNull()
  })
})

describe('hashForSettingsSection', () => {
  it('maps sections to hashes', () => {
    expect(hashForSettingsSection('appearance')).toBe('appearance')
    expect(hashForSettingsSection('access')).toBe('access')
  })
})

describe('settingsSectionFromQuery', () => {
  it('maps legacy query values, including sidebar alias', () => {
    expect(settingsSectionFromQuery('access')).toBe('access')
    expect(settingsSectionFromQuery('sidebar')).toBe('appearance')
    expect(settingsSectionFromQuery(null)).toBeNull()
  })
})
