import { useEffect, useState } from 'react'
import {
  ensureSkillsLoaded,
  getSkillAssignmentsSnapshot,
  getSkillsForEmployee,
  getSkillsSnapshot,
  subscribeSkillsStore,
} from './store'
import type { Skill } from './types'

function useHydrateSkills() {
  useEffect(() => {
    void ensureSkillsLoaded().catch(() => {
      /* pages keep last snapshot until the next remount */
    })
  }, [])
}

export function useSkillsLibrary() {
  useHydrateSkills()
  const [skills, setSkills] = useState<Skill[]>(() => getSkillsSnapshot())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeSkillsStore(() => setTick((n) => n + 1))
  }, [])

  useEffect(() => {
    void tick
    setSkills(getSkillsSnapshot())
  }, [tick])

  return { skills }
}

export function useEmployeeSkills(employeeId: number) {
  useHydrateSkills()
  const [skills, setSkills] = useState<Skill[]>(() =>
    getSkillsForEmployee(employeeId),
  )
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeSkillsStore(() => setTick((n) => n + 1))
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
    return subscribeSkillsStore(() => setTick((n) => n + 1))
  }, [])

  useEffect(() => {
    void tick
    const next: Record<string, number> = {}
    for (const assignment of getSkillAssignmentsSnapshot()) {
      for (const skillId of assignment.skillIds) {
        next[skillId] = (next[skillId] ?? 0) + 1
      }
    }
    setCounts(next)
  }, [tick])

  return counts
}
