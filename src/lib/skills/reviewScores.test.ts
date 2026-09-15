import { describe, expect, it } from 'vitest'
import {
  averageSkillGrade,
  hasStoredSkillGrades,
  isSkillScorePillarId,
  skillIdFromScorePillarId,
  skillScorePillarId,
  skillsWithStoredGrades,
} from './reviewScores'

describe('skill review scores', () => {
  it('builds and parses skill pillar ids', () => {
    expect(skillScorePillarId('skill-ai-fluency')).toBe('skill:skill-ai-fluency')
    expect(isSkillScorePillarId('skill:skill-ai-fluency')).toBe(true)
    expect(isSkillScorePillarId('skills')).toBe(false)
    expect(skillIdFromScorePillarId('skill:skill-ai-fluency')).toBe(
      'skill-ai-fluency',
    )
    expect(skillIdFromScorePillarId('skills')).toBeNull()
  })

  it('averages graded bands to the nearest label', () => {
    expect(averageSkillGrade(['exceeding', 'performing'])).toBe('performing')
    expect(averageSkillGrade(['exceptional', 'exceeding'])).toBe('exceeding')
    expect(averageSkillGrade(['performing', 'performing'])).toBe('performing')
    expect(averageSkillGrade(['', null, undefined])).toBeNull()
  })

  it('detects stored skill grades for the prior-only view', () => {
    expect(hasStoredSkillGrades({})).toBe(false)
    expect(hasStoredSkillGrades({ 'skill-ai-fluency': '' })).toBe(false)
    expect(hasStoredSkillGrades({ 'skill-ai-fluency': 'performing' })).toBe(
      true,
    )
  })

  it('lists only skills that still have a grade', () => {
    const rows = skillsWithStoredGrades(
      {
        'skill-ai-fluency': 'performing',
        'skill-accuracy': '',
        'skill-gone': 'exceeding',
      },
      [
        {
          id: 'skill-ai-fluency',
          name: 'AI Fluency',
          function: '',
          role: '',
          status: 'approved',
        },
      ],
    )
    expect(rows.map((skill) => skill.id)).toEqual([
      'skill-ai-fluency',
      'skill-gone',
    ])
    expect(rows[1]?.name).toBe('Previously graded skill')
  })
})
