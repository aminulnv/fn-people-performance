/** Lower is closer. Exact name, then prefix, then name contains, then description only. */

export function fieldMatchScore(value: string, query: string): number | null {
  const text = value.trim().toLowerCase()
  if (!text || !query) return null
  if (text === query) return 0
  if (text.startsWith(query)) return 1
  if (text.includes(query)) return 2
  return null
}

export function bestFieldScore(
  values: Array<string | number>,
  query: string,
): number | null {
  let best: number | null = null
  for (const value of values) {
    const score = fieldMatchScore(String(value), query)
    if (score === null) continue
    if (best === null || score < best) best = score
  }
  return best
}

export function nameRelevanceScore(
  label: string,
  related: Array<string | number>,
  query: string,
): number {
  const nameScore = fieldMatchScore(label, query)
  if (nameScore !== null) return nameScore
  return bestFieldScore(related, query) === null ? 4 : 3
}

export function compareByNameRelevance<
  T extends { score: number; label: string },
>(left: T, right: T): number {
  return left.score - right.score || left.label.localeCompare(right.label)
}

export function compareGroupsByNameRelevance<T extends { score: number }>(
  sectionOrder: readonly string[],
): (
  left: { section: string; items: T[] },
  right: { section: string; items: T[] },
) => number {
  return (left, right) => {
    const leftScore = Math.min(...left.items.map((item) => item.score))
    const rightScore = Math.min(...right.items.map((item) => item.score))
    return (
      leftScore - rightScore ||
      sectionOrder.indexOf(left.section) - sectionOrder.indexOf(right.section)
    )
  }
}
