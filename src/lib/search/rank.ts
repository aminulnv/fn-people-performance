import { mergeHighlightRanges, scoreFuzzy } from './fuzzy'
import { parseSearchQuery, resolveSearchScope } from './query'
import type {
  HighlightRange,
  RankedSearchItem,
  SearchGroup,
  SearchItem,
  SearchKind,
  SearchScope,
} from './types'
import { SEARCH_KIND_GROUP, SEARCH_KIND_ORDER } from './types'

export const SEARCH_LIMIT_PER_GROUP = 8
export const SEARCH_LIMIT_EMPTY = 12

const LABEL_FIELD_BOOST = 800
const DESCRIPTION_FIELD_BOOST = 150
const EMPLOYEE_ID_BOOST = 1200

export type SearchPresentation = {
  queryText: string
  scope: SearchScope
  groups: SearchGroup[]
  flat: RankedSearchItem[]
}

function fieldsOf(item: SearchItem): string[] {
  return [item.label, item.description ?? '', ...item.keywords]
}

function fieldBoost(item: SearchItem, field: string): number {
  if (field === item.label) return LABEL_FIELD_BOOST
  if (item.description && field === item.description) {
    return DESCRIPTION_FIELD_BOOST
  }
  return 0
}

export function scoreSearchItem(
  item: SearchItem,
  queryText: string,
): { score: number; highlights: HighlightRange[] } | null {
  const tokens = queryText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return { score: 0, highlights: [] }

  let total = 0
  const labelRanges: HighlightRange[] = []

  for (const token of tokens) {
    let best: { score: number; field: string; ranges: HighlightRange[] } | null =
      null
    for (const field of fieldsOf(item)) {
      const match = scoreFuzzy(token, field)
      if (!match) continue
      const score = match.score + fieldBoost(item, field)
      if (!best || score > best.score) {
        best = { score, field, ranges: match.ranges }
      }
    }
    if (!best) return null
    total += best.score
    if (best.field === item.label) labelRanges.push(...best.ranges)
  }

  if (item.kind === 'person' && tokens.length === 1 && /^\d+$/.test(tokens[0])) {
    if (item.keywords.includes(tokens[0])) total += EMPLOYEE_ID_BOOST
  }

  return {
    score: total,
    highlights: mergeHighlightRanges(labelRanges),
  }
}

function toRanked(
  item: SearchItem,
  score = 0,
  highlights: HighlightRange[] = [],
): RankedSearchItem {
  return { ...item, score, highlights }
}

function groupItems(items: RankedSearchItem[]): SearchGroup[] {
  const byKind = new Map<SearchKind, RankedSearchItem[]>()
  for (const item of items) {
    const bucket = byKind.get(item.kind) ?? []
    if (bucket.length >= SEARCH_LIMIT_PER_GROUP) continue
    bucket.push(item)
    byKind.set(item.kind, bucket)
  }

  const groups: SearchGroup[] = []
  for (const kind of SEARCH_KIND_ORDER) {
    const bucket = byKind.get(kind)
    if (!bucket?.length) continue
    const meta = SEARCH_KIND_GROUP[kind]
    groups.push({ id: meta.id, label: meta.label, items: bucket })
  }
  return groups
}

function flattenGroups(groups: SearchGroup[]): RankedSearchItem[] {
  return groups.flatMap((group) => group.items)
}

function recentItems(
  items: SearchItem[],
  recentIds: string[],
): RankedSearchItem[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  return recentIds
    .map((id) => byId.get(id))
    .filter((item): item is SearchItem => item != null)
    .slice(0, SEARCH_LIMIT_PER_GROUP)
    .map((item, index) => toRanked(item, 2000 - index))
}

function emptyQueryItems(
  items: SearchItem[],
  scope: SearchScope,
  recentIds: string[],
): SearchGroup[] {
  const recents = recentItems(items, recentIds)
  const groups: SearchGroup[] = []
  if (recents.length > 0) {
    groups.push({ id: 'recent', label: 'Recent', items: recents })
  }

  const recentIdsSet = new Set(recents.map((item) => item.id))
  const leftover = items.filter((item) => !recentIdsSet.has(item.id))

  if (scope === 'all') {
    const jumps = leftover
      .filter((item) => item.kind === 'action')
      .slice(0, 4)
      .map((item) => toRanked(item))
    const pages = leftover
      .filter((item) => item.kind === 'page')
      .slice(0, SEARCH_LIMIT_EMPTY)
      .map((item) => toRanked(item))
    if (jumps.length > 0) {
      groups.push({
        id: 'action',
        label: SEARCH_KIND_GROUP.action.label,
        items: jumps,
      })
    }
    if (pages.length > 0) {
      groups.push({
        id: 'page',
        label: SEARCH_KIND_GROUP.page.label,
        items: pages,
      })
    }
    return groups
  }

  const scoped = leftover
    .slice()
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }),
    )
    .slice(0, SEARCH_LIMIT_EMPTY)
    .map((item) => toRanked(item))
  groups.push(...groupItems(scoped))
  return groups
}

export function presentSearchResults(
  items: SearchItem[],
  rawQuery: string,
  chipScope: SearchScope,
  recentIds: string[] = [],
): SearchPresentation {
  const parsed = parseSearchQuery(rawQuery)
  const scope = resolveSearchScope(parsed, chipScope)
  const scoped =
    scope === 'all' ? items : items.filter((item) => item.scope === scope)

  if (!parsed.text) {
    const groups = emptyQueryItems(scoped, scope, recentIds)
    return {
      queryText: parsed.text,
      scope,
      groups,
      flat: flattenGroups(groups),
    }
  }

  const ranked = scoped
    .map((item) => {
      const match = scoreSearchItem(item, parsed.text)
      if (!match) return null
      return toRanked(item, match.score, match.highlights)
    })
    .filter((item): item is RankedSearchItem => item != null)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.label.localeCompare(right.label, undefined, {
        sensitivity: 'base',
      })
    })

  const groups = groupItems(ranked).sort(
    (left, right) => (right.items[0]?.score ?? 0) - (left.items[0]?.score ?? 0),
  )
  return {
    queryText: parsed.text,
    scope,
    groups,
    flat: flattenGroups(groups),
  }
}
