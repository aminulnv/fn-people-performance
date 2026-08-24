import type { SearchItem } from './types'

export const SEARCH_RECENTS_KEY = 'pd-global-search-recents-v1'
export const SEARCH_RECENTS_LIMIT = 8

export type RecentSearchRef = {
  id: string
  visitedAt: string
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

export function readRecentSearchRefs(): RecentSearchRef[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(SEARCH_RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is RecentSearchRef => {
        return (
          Boolean(entry) &&
          typeof entry === 'object' &&
          typeof (entry as RecentSearchRef).id === 'string' &&
          typeof (entry as RecentSearchRef).visitedAt === 'string'
        )
      })
      .slice(0, SEARCH_RECENTS_LIMIT)
  } catch {
    return []
  }
}

export function readRecentSearchIds(): string[] {
  return readRecentSearchRefs().map((entry) => entry.id)
}

export function rememberSearchVisit(
  item: Pick<SearchItem, 'id'>,
  now = new Date(),
): RecentSearchRef[] {
  const next: RecentSearchRef[] = [
    { id: item.id, visitedAt: now.toISOString() },
    ...readRecentSearchRefs().filter((entry) => entry.id !== item.id),
  ].slice(0, SEARCH_RECENTS_LIMIT)

  if (canUseStorage()) {
    localStorage.setItem(SEARCH_RECENTS_KEY, JSON.stringify(next))
  }
  return next
}

export function clearRecentSearches(): void {
  if (!canUseStorage()) return
  localStorage.removeItem(SEARCH_RECENTS_KEY)
}
