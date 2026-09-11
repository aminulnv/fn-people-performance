import { normalizeUrlHash } from '@/lib/routing/urlHash'

export type GroupSettingsJob = 'people' | 'goals' | 'review' | 'calibration'
export type GroupPeoplePaneHash = 'added' | 'not-added'

export type GroupSettingsHashState = {
  job: GroupSettingsJob
  peoplePane: GroupPeoplePaneHash
  reviewFormOpen: boolean
}

export type CycleOverlayHash =
  | { kind: 'cycle-details' }
  | ({ kind: 'group'; groupId: string } & GroupSettingsHashState)

const GROUP_JOBS: readonly GroupSettingsJob[] = [
  'people',
  'goals',
  'review',
  'calibration',
]

/** Open on Added so the panel mounts a small list, not the full directory. */
const DEFAULT_PEOPLE_PANE: GroupPeoplePaneHash = 'added'

function isGroupJob(value: string): value is GroupSettingsJob {
  return (GROUP_JOBS as readonly string[]).includes(value)
}

function isPeoplePane(value: string): value is GroupPeoplePaneHash {
  return value === 'added' || value === 'not-added'
}

function parseSettingsParts(parts: string[]): GroupSettingsHashState | null {
  const [jobPart, subPart] = parts
  if (!jobPart) {
    return {
      job: 'people',
      peoplePane: DEFAULT_PEOPLE_PANE,
      reviewFormOpen: false,
    }
  }
  if (!isGroupJob(jobPart)) return null

  if (jobPart === 'people') {
    return {
      job: 'people',
      peoplePane: isPeoplePane(subPart ?? '') ? subPart : DEFAULT_PEOPLE_PANE,
      reviewFormOpen: false,
    }
  }

  if (jobPart === 'review') {
    return {
      job: 'review',
      peoplePane: DEFAULT_PEOPLE_PANE,
      reviewFormOpen: subPart === 'form',
    }
  }

  return {
    job: jobPart,
    peoplePane: DEFAULT_PEOPLE_PANE,
    reviewFormOpen: false,
  }
}

/** Page route `/cycles/:id/groups/:groupId` — hash is `#people/added`, `#review/form`, … */
export function groupSettingsFromHash(hash: string): GroupSettingsHashState {
  const normalized = normalizeUrlHash(hash)
  if (!normalized) {
    return {
      job: 'people',
      peoplePane: DEFAULT_PEOPLE_PANE,
      reviewFormOpen: false,
    }
  }
  return (
    parseSettingsParts(normalized.split('/').filter(Boolean)) ?? {
      job: 'people',
      peoplePane: DEFAULT_PEOPLE_PANE,
      reviewFormOpen: false,
    }
  )
}

export function hashForGroupSettings(state: GroupSettingsHashState): string {
  if (state.job === 'people') {
    return `people/${state.peoplePane}`
  }
  if (state.job === 'review' && state.reviewFormOpen) {
    return 'review/form'
  }
  return state.job
}

/** Cycle settings overlays — `#cycle-details` or `#group/{id}/people/added`. */
export function cycleOverlayFromHash(hash: string): CycleOverlayHash | null {
  const normalized = normalizeUrlHash(hash)
  if (!normalized) return null
  if (normalized === 'cycle-details') return { kind: 'cycle-details' }

  const parts = normalized.split('/').filter(Boolean)
  if (parts[0] !== 'group' || !parts[1]) return null
  const settings = parseSettingsParts(parts.slice(2))
  if (!settings) return null
  return { kind: 'group', groupId: decodeURIComponent(parts[1]), ...settings }
}

export function hashForCycleOverlay(overlay: CycleOverlayHash): string {
  if (overlay.kind === 'cycle-details') return 'cycle-details'
  const settingsHash = hashForGroupSettings(overlay)
  return `group/${encodeURIComponent(overlay.groupId)}/${settingsHash}`
}

export function peoplePaneFromHash(
  pane: GroupPeoplePaneHash,
): 'browse' | 'selected' {
  return pane === 'added' ? 'selected' : 'browse'
}

export function hashForPeoplePane(pane: 'browse' | 'selected'): GroupPeoplePaneHash {
  return pane === 'selected' ? 'added' : 'not-added'
}
