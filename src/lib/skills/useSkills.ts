import { useEffect, useState } from 'react'
import { subscribeEmployeesStore } from '@/lib/employees/store'
import {
  roleUsageBySkillId,
  type SkillRoleRef,
  type PersonSkill,
} from '@/lib/roles/inheritedSkills'
import { ensureRolesLoaded, subscribeRolesStore } from '@/lib/roles/store'
import {
  areSkillsHydrated,
  ensureSkillsLoaded,
  getSkillById,
  getSkillsForEmployee,
  getSkillsSnapshot,
  subscribeSkillsStore,
  talentCountForSkill,
} from './store'
import type { Skill } from './types'

function useHydrateSkills(load = true) {
  useEffect(() => {
    if (!load) return
    void ensureSkillsLoaded().catch(() => {
      /* pages keep last snapshot until the next remount */
    })
    void ensureRolesLoaded().catch(() => {})
  }, [load])
}

export function useSkillsLibrary(options?: { load?: boolean }) {
  useHydrateSkills(options?.load !== false)
  const [skills, setSkills] = useState<Skill[]>(() => getSkillsSnapshot())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeSkillsStore(() => setTick((n) => n + 1))
  }, [])

  useEffect(() => {
    void tick
    setSkills(getSkillsSnapshot())
  }, [tick])

  return { skills, ready: areSkillsHydrated() }
}

export function useSkill(skillId: string) {
  useHydrateSkills()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeSkillsStore(() => setTick((n) => n + 1))
  }, [])

  void tick
  return {
    skill: skillId ? getSkillById(skillId) : null,
    ready: areSkillsHydrated(),
  }
}

export function useEmployeeSkills(
  employeeId: number,
  options?: { load?: boolean },
) {
  useHydrateSkills(options?.load !== false)
  const [skills, setSkills] = useState<PersonSkill[]>(() =>
    getSkillsForEmployee(employeeId),
  )
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubSkills = subscribeSkillsStore(() => setTick((n) => n + 1))
    const unsubRoles = subscribeRolesStore(() => setTick((n) => n + 1))
    const unsubEmployees = subscribeEmployeesStore(() =>
      setTick((n) => n + 1),
    )
    return () => {
      unsubSkills()
      unsubRoles()
      unsubEmployees()
    }
  }, [])

  useEffect(() => {
    void tick
    setSkills(getSkillsForEmployee(employeeId))
  }, [employeeId, tick])

  return skills
}

export function useSkillTalentCounts() {
  useHydrateSkills()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubSkills = subscribeSkillsStore(() => setTick((n) => n + 1))
    const unsubRoles = subscribeRolesStore(() => setTick((n) => n + 1))
    const unsubEmployees = subscribeEmployeesStore(() =>
      setTick((n) => n + 1),
    )
    return () => {
      unsubSkills()
      unsubRoles()
      unsubEmployees()
    }
  }, [])

  useEffect(() => {
    void tick
    const next: Record<string, number> = {}
    for (const skill of getSkillsSnapshot()) {
      next[skill.id] = talentCountForSkill(skill.id)
    }
    setCounts(next)
  }, [tick])

  return counts
}

/** Live map of skillId → roles that include it on their competency matrix. */
export function useSkillRoleUsage(): Record<string, SkillRoleRef[]> {
  useHydrateSkills()
  const [usage, setUsage] = useState<Record<string, SkillRoleRef[]>>(() =>
    roleUsageBySkillId(),
  )
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubSkills = subscribeSkillsStore(() => setTick((n) => n + 1))
    const unsubRoles = subscribeRolesStore(() => setTick((n) => n + 1))
    return () => {
      unsubSkills()
      unsubRoles()
    }
  }, [])

  useEffect(() => {
    void tick
    setUsage(roleUsageBySkillId())
  }, [tick])

  return usage
}
