import { describe, expect, it } from 'vitest'
import {
  formatCareerTenure,
  inGradeLabel,
  lastPromoLabel,
  pipStatusLabel,
} from './career'

describe('career readouts', () => {
  it('leaves in grade and last promo blank when there is no history', () => {
    expect(inGradeLabel(undefined)).toBe('—')
    expect(lastPromoLabel(undefined)).toBe('—')
    expect(pipStatusLabel(false)).toBe('No PIP on record')
    expect(pipStatusLabel(true)).toBe('Active PIP')
  })

  it('formats tenure from the stored effective date', () => {
    expect(formatCareerTenure('2024-09-18', '2026-09-18')).toBe('2 yr')
    expect(formatCareerTenure('2026-08-18', '2026-09-18')).toBe('1 mo')
    expect(formatCareerTenure('2026-09-18', '2026-09-18')).toBe('<1 mo')
  })
})
