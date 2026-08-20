import {
  GOALS_MY_GOALS_HASH,
  GOALS_MY_REPORTS_HASH,
  hashForManagerTab,
  managerTabFromHash,
  type GoalsManagerTab,
} from '@/pages/goals/goalHelpers'
import { normalizeUrlHash } from '@/lib/routing/urlHash'
import type { ProfileTabId } from '@/pages/EmployeeProfilePage'

const PROFILE_TAB_HASHES: Record<Exclude<ProfileTabId, 'goals'>, string> = {
  profile: 'profile',
  performance: 'performance',
  team: 'team',
}

export function profileTabFromHash(hash: string): ProfileTabId | null {
  const normalized = normalizeUrlHash(hash)
  if (normalized === GOALS_MY_GOALS_HASH || normalized === GOALS_MY_REPORTS_HASH) {
    return 'goals'
  }
  if (
    normalized === PROFILE_TAB_HASHES.profile ||
    normalized === PROFILE_TAB_HASHES.performance ||
    normalized === PROFILE_TAB_HASHES.team
  ) {
    return normalized
  }
  return null
}

export function hashForProfileTab(tab: ProfileTabId): string {
  if (tab === 'goals') return GOALS_MY_GOALS_HASH
  return PROFILE_TAB_HASHES[tab]
}

export function profileGoalsManagerTabFromHash(hash: string): GoalsManagerTab {
  return managerTabFromHash(hash) ?? 'mine'
}

export function hashForProfileGoalsManagerTab(tab: GoalsManagerTab): string {
  return hashForManagerTab(tab)
}
