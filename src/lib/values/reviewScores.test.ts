import { describe, expect, it } from 'vitest'
import {
  averageValueGrade,
  hasStoredValueGrades,
  isValueScorePillarId,
  valueIdFromScorePillarId,
  valueScorePillarId,
  valuesWithStoredGrades,
} from './reviewScores'

describe('value review scores', () => {
  it('builds and parses value pillar ids without matching the values pillar', () => {
    expect(valueScorePillarId('move-fast')).toBe('value:move-fast')
    expect(isValueScorePillarId('value:move-fast')).toBe(true)
    expect(isValueScorePillarId('values')).toBe(false)
    expect(valueIdFromScorePillarId('value:move-fast')).toBe('move-fast')
    expect(valueIdFromScorePillarId('values')).toBeNull()
  })

  it('averages graded bands to the nearest label', () => {
    expect(averageValueGrade(['exceeding', 'performing'])).toBe('performing')
    expect(averageValueGrade(['performing', 'performing'])).toBe('performing')
    expect(averageValueGrade(['', null, undefined])).toBeNull()
  })

  it('lists only values that still have a grade', () => {
    expect(hasStoredValueGrades({})).toBe(false)
    const rows = valuesWithStoredGrades({
      'move-fast': 'performing',
      'product-first': '',
      gone: 'exceeding',
    })
    expect(rows.map((value) => value.id)).toEqual(['move-fast', 'gone'])
    expect(rows[1]?.name).toBe('Previously graded value')
  })
})
