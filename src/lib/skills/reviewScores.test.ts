import { describe, expect, it } from 'vitest'
import {
  averageSkillGrade,
  hasStoredSkillGrades,
  isSkillScorePillarId,
  normalizeSkillGrade,
  skillGradeLabel,
  skillIdFromScorePillarId,
  skillScorePillarId,
  skillsWithStoredGrades,
} from './reviewScores'
import { emptySkillMastery } from './types'

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

  it('normalizes mastery and legacy performance bands', () => {
    expect(normalizeSkillGrade('poor')).toBe('poor')
    expect(normalizeSkillGrade('expert')).toBe('expert')
    expect(normalizeSkillGrade('unsatisfactory')).toBe('poor')
    expect(normalizeSkillGrade('developing')).toBe('basic')
    expect(normalizeSkillGrade('performing')).toBe('intermediate')
    expect(normalizeSkillGrade('exceeding')).toBe('advanced')
    expect(normalizeSkillGrade('exceptional')).toBe('expert')
    expect(skillGradeLabel('basic')).toBe('Basic')
    expect(skillGradeLabel('performing')).toBe('Intermediate')
  })

  it('averages graded levels onto the performance band scale', () => {
    expect(averageSkillGrade(['advanced', 'intermediate'])).toBe('exceeding')
    expect(averageSkillGrade(['expert', 'advanced'])).toBe('exceptional')
    expect(averageSkillGrade(['intermediate', 'intermediate'])).toBe(
      'performing',
    )
    expect(averageSkillGrade(['poor', 'poor'])).toBe('unsatisfactory')
    expect(averageSkillGrade(['', null, undefined])).toBeNull()
    // Legacy bands normalize then average
    expect(averageSkillGrade(['exceeding', 'performing'])).toBe('exceeding')
  })

  it('detects stored skill grades for the prior-only view', () => {
    expect(hasStoredSkillGrades({})).toBe(false)
    expect(hasStoredSkillGrades({ 'skill-ai-fluency': '' })).toBe(false)
    expect(hasStoredSkillGrades({ 'skill-ai-fluency': 'intermediate' })).toBe(
      true,
    )
    expect(hasStoredSkillGrades({ 'skill-ai-fluency': 'performing' })).toBe(
      true,
    )
  })

  it('lists only skills that still have a grade', () => {
    const rows = skillsWithStoredGrades(
      {
        'skill-ai-fluency': 'intermediate',
        'skill-accuracy': '',
        'skill-gone': 'advanced',
      },
      [
        {
          id: 'skill-ai-fluency',
          name: 'AI Fluency',
          role: '',
          status: 'approved',
          mastery: emptySkillMastery(),
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
