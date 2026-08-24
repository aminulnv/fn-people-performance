import type { HighlightRange } from './types'

function isWordBoundary(text: string, index: number): boolean {
  if (index <= 0) return true
  return /[\s\-_./:@#]/.test(text[index - 1] ?? '')
}

function mergeIndices(indices: number[]): HighlightRange[] {
  if (indices.length === 0) return []
  const ranges: HighlightRange[] = []
  let start = indices[0]
  let end = start + 1
  for (let index = 1; index < indices.length; index += 1) {
    const current = indices[index]
    if (current === end) {
      end += 1
      continue
    }
    ranges.push({ start, end })
    start = current
    end = current + 1
  }
  ranges.push({ start, end })
  return ranges
}

export function mergeHighlightRanges(
  ranges: HighlightRange[],
): HighlightRange[] {
  if (ranges.length === 0) return []
  const sorted = ranges.slice().sort((left, right) => left.start - right.start)
  const merged: HighlightRange[] = [{ ...sorted[0] }]
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const last = merged[merged.length - 1]
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
      continue
    }
    merged.push({ ...current })
  }
  return merged
}

/**
 * Score a query against one field. Substring matches rank above scattered
 * subsequence matches so "ali" prefers Alice over "Annual calibration".
 */
export function scoreFuzzy(
  query: string,
  text: string,
): { score: number; ranges: HighlightRange[] } | null {
  const needle = query.trim().toLowerCase()
  const haystack = text.toLowerCase()
  if (!needle) return { score: 0, ranges: [] }
  if (!haystack) return null

  const substringAt = haystack.indexOf(needle)
  if (substringAt >= 0) {
    let score = 1400 - substringAt
    if (substringAt === 0) score += 240
    else if (isWordBoundary(haystack, substringAt)) score += 140
    return {
      score,
      ranges: [{ start: substringAt, end: substringAt + needle.length }],
    }
  }

  const matched: number[] = []
  let cursor = 0
  for (const character of needle) {
    if (character === ' ') continue
    let found = -1
    for (let index = cursor; index < haystack.length; index += 1) {
      if (haystack[index] === character) {
        found = index
        break
      }
    }
    if (found < 0) return null
    matched.push(found)
    cursor = found + 1
  }

  let score = 360
  let run = 0
  for (let index = 0; index < matched.length; index += 1) {
    const position = matched[index]
    if (index > 0 && position === matched[index - 1] + 1) {
      run += 1
      score += 18 + run * 6
    } else {
      run = 0
      if (index > 0) {
        score -= Math.min(16, position - matched[index - 1] - 1)
      }
    }
    if (isWordBoundary(haystack, position)) score += 32
  }
  score -= matched[0] ?? 0

  return { score, ranges: mergeIndices(matched) }
}
