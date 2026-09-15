import { describe, expect, it } from 'vitest'
import { SEED_SKILLS } from './seed'
import {
  assignSkillToEmployee,
  createSkill,
  getSkillIdsForEmployee,
  getSkillsForEmployee,
  getSkillsSnapshot,
  removeSkillFromEmployee,
  resetSkillsStoreForTests,
  talentCountForSkill,
} from './store'

describe('skills store', () => {
  it('seeds skills with no talent until people are assigned', async () => {
    resetSkillsStoreForTests()
    const skills = getSkillsSnapshot()
    expect(skills.length).toBe(SEED_SKILLS.length)
    expect(skills.some((skill) => skill.name === 'AI Fluency')).toBe(true)
    expect(talentCountForSkill(skills[0]!.id)).toBe(0)
  })

  it('persists library skills in localStorage', async () => {
    resetSkillsStoreForTests()
    const created = await createSkill({
      name: 'Facilitation',
      function: 'HR',
      role: 'Manager',
    })
    expect(created.name).toBe('Facilitation')
    expect(created.function).toBe('HR')
    expect(created.status).toBe('approved')
    expect(getSkillsSnapshot().some((skill) => skill.id === created.id)).toBe(
      true,
    )
    const raw = localStorage.getItem('pd-skills-library-v2')
    expect(raw).toContain('Facilitation')
  })

  it('requires a name', async () => {
    resetSkillsStoreForTests()
    await expect(createSkill({ name: '   ' })).rejects.toThrow(
      'Give the skill a name.',
    )
  })

  it('assigns and removes skills on a person', async () => {
    resetSkillsStoreForTests()
    const skill = getSkillsSnapshot()[0]!
    await assignSkillToEmployee(1, skill.id)
    expect(getSkillIdsForEmployee(1)).toEqual([skill.id])
    expect(getSkillsForEmployee(1).map((item) => item.id)).toEqual([skill.id])
    expect(talentCountForSkill(skill.id)).toBe(1)

    await removeSkillFromEmployee(1, skill.id)
    expect(getSkillIdsForEmployee(1)).toEqual([])
    expect(talentCountForSkill(skill.id)).toBe(0)
  })
})
