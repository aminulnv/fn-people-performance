/** Persists which table columns stay visible across reloads. */

export function readVisibleColumnIds(
  storageKey: string,
  allIds: readonly string[],
  requiredIds: readonly string[] = [],
  defaultIds: readonly string[] = allIds,
): string[] {
  const allowed = new Set(allIds)
  const required = requiredIds.filter((id) => allowed.has(id))
  const fallback = (() => {
    const next = new Set([
      ...required,
      ...defaultIds.filter((id) => allowed.has(id)),
    ])
    return allIds.filter((id) => next.has(id))
  })()

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return fallback
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return fallback

    const selected = parsed.filter(
      (id): id is string => typeof id === 'string' && allowed.has(id),
    )
    const next = new Set([...required, ...selected])
    return allIds.filter((id) => next.has(id))
  } catch {
    return fallback
  }
}

export function writeVisibleColumnIds(
  storageKey: string,
  visibleIds: readonly string[],
): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...visibleIds]))
  } catch {
    // Private mode / quota - visibility still works for the session.
  }
}
