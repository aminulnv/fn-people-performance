import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { DEMO_ACCOUNTS } from '@/lib/demoAccounts'
import {
  getGoalsSnapshot,
  subscribeGoalsStore,
} from '@/lib/goals/store'
import type { DemoPerson } from '@/lib/goals/types'

/** Logged-in person from auth, enriched with goals org profile when available. */
export function useCurrentPerson(): DemoPerson | null {
  const { user } = useAuth()
  const [tick, setTick] = useState(0)

  useEffect(() => subscribeGoalsStore(() => setTick((n) => n + 1)), [])
  void tick

  if (!user) return null

  const fromGoals = getGoalsSnapshot().people.find(
    (p) => p.id === user.personId || p.email === user.email,
  )
  if (fromGoals) return fromGoals

  const account = DEMO_ACCOUNTS.find((a) => a.personId === user.personId)
  return {
    id: user.personId,
    name: user.name,
    email: user.email,
    title: user.title,
    department: '',
    role: user.role,
    joinDate: '2020-01-01',
    reportIds: [],
    avatarHue: account?.avatarHue ?? 220,
    blurb: '',
  }
}
