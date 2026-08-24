import type { ParsedSearchQuery, SearchScope } from './types'

const PREFIXES: Array<{ pattern: RegExp; scope: SearchScope }> = [
  { pattern: /^@\s*/, scope: 'people' },
  { pattern: /^(person:|people:|p:)\s*/i, scope: 'people' },
  { pattern: /^(goal:|goals:|g:)\s*/i, scope: 'goals' },
  { pattern: /^(cycle:|cycles:|c:)\s*/i, scope: 'reviews' },
  { pattern: /^(review:|reviews:|r:)\s*/i, scope: 'reviews' },
  { pattern: /^(dept:|department:|team:|org:|d:|t:)\s*/i, scope: 'organisation' },
  { pattern: /^(page:|pages:|#)\s*/i, scope: 'pages' },
  { pattern: /^(action:|actions:|>)\s*/i, scope: 'actions' },
]

/** Pull a typed scope off the front of the query (`@ada`, `g:`, `>`). */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim()
  if (!trimmed) return { scope: 'all', text: '' }

  for (const prefix of PREFIXES) {
    const match = prefix.pattern.exec(trimmed)
    if (!match) continue
    return {
      scope: prefix.scope,
      text: trimmed.slice(match[0].length).trim(),
    }
  }

  return { scope: 'all', text: trimmed }
}

export function resolveSearchScope(
  parsed: ParsedSearchQuery,
  chipScope: SearchScope,
): SearchScope {
  return parsed.scope === 'all' ? chipScope : parsed.scope
}
