/** Isolated Goals V2 URLs — never fall back to `/goals`. */

export function goalsV2DetailPath(cycleId: string, personId: string): string {
  return `/goals-v2/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

export function goalsV2GoalPath(
  cycleId: string,
  personId: string,
  goalId: string,
): string {
  return `${goalsV2DetailPath(cycleId, personId)}/${encodeURIComponent(goalId)}`
}

export function goalsV2OverviewPath(): string {
  return '/goals'
}
