import { apiFetch } from '@/lib/apiClient'
import type { EmployeeSkillAssignment, Skill, SkillMastery } from './types'

export async function fetchSkillsSnapshotRemote(): Promise<{
  skills: Skill[]
  assignments: EmployeeSkillAssignment[]
}> {
  return apiFetch<{
    skills: Skill[]
    assignments: EmployeeSkillAssignment[]
  }>('/api/platform/skills')
}

export async function createSkillRemote(body: {
  name: string
  department?: string
  role?: string
  status?: Skill['status']
  mastery?: SkillMastery
}): Promise<Skill> {
  const response = await apiFetch<{ skill: Skill }>('/api/platform/skills', {
    method: 'POST',
    body,
  })
  return response.skill
}

export async function updateSkillRemote(
  skillId: string,
  body: {
    name: string
    department?: string
    role?: string
    status?: Skill['status']
    mastery?: SkillMastery
  },
): Promise<Skill> {
  const response = await apiFetch<{ skill: Skill }>(
    `/api/platform/skills/${encodeURIComponent(skillId)}`,
    { method: 'PATCH', body },
  )
  return response.skill
}

export async function setEmployeeSkillIdsRemote(
  employeeId: number,
  skillIds: string[],
): Promise<EmployeeSkillAssignment> {
  const response = await apiFetch<{ assignment: EmployeeSkillAssignment }>(
    `/api/platform/skills/assignments/${employeeId}`,
    { method: 'PUT', body: { skillIds } },
  )
  return response.assignment
}
