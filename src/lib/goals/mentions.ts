export type MentionablePerson = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

export const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g

const MENTION_QUERY_PATTERN = /(?:^|[\s])@(?!\[)([^@]*)$/

export function formatMentionToken(person: Pick<MentionablePerson, 'id' | 'name'>): string {
  return `@[${person.name}](${person.id})`
}

export function displayMentionText(text: string): string {
  return text.replace(MENTION_TOKEN_PATTERN, '@$1')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function mentionQueryAt(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, Math.max(0, cursor))
  const match = MENTION_QUERY_PATTERN.exec(before)
  if (!match) return null
  const start = match.index + match[0].lastIndexOf('@')
  return { start, query: match[1] }
}

export function insertMention(
  text: string,
  cursor: number,
  person: Pick<MentionablePerson, 'id' | 'name'>,
): { text: string; cursor: number } {
  const token = `${formatMentionToken(person)} `
  const query = mentionQueryAt(text, cursor)
  const start = query?.start ?? cursor
  const next = `${text.slice(0, start)}${token}${text.slice(cursor)}`
  return { text: next, cursor: start + token.length }
}

export function filterMentionCandidates(
  people: MentionablePerson[],
  query: string,
  limit = 8,
): MentionablePerson[] {
  const needle = query.trim().toLowerCase()
  const matches = needle
    ? people.filter((person) => {
        const name = person.name.toLowerCase()
        const title = person.title?.toLowerCase() ?? ''
        return name.includes(needle) || title.includes(needle)
      })
    : people
  return matches.slice(0, limit)
}

export function resolveMentionedPeople(
  text: string,
  people: MentionablePerson[],
): MentionablePerson[] {
  const byId = new Map(people.map((person) => [person.id, person]))
  const found = new Map<string, MentionablePerson>()

  for (const match of text.matchAll(new RegExp(MENTION_TOKEN_PATTERN.source, 'g'))) {
    const person = byId.get(match[2])
    if (person) found.set(person.id, person)
  }

  const remainder = text.replace(new RegExp(MENTION_TOKEN_PATTERN.source, 'g'), ' ')
  const unmatched = [...people]
    .filter((person) => !found.has(person.id))
    .sort((left, right) => right.name.length - left.name.length)

  for (const person of unmatched) {
    const pattern = new RegExp(
      `(^|\\s)@${escapeRegExp(person.name)}(?=$|[\\s.,!?;:])`,
      'i',
    )
    if (pattern.test(remainder)) found.set(person.id, person)
  }

  return people.filter((person) => found.has(person.id))
}

export function mentionedIdsIn(
  text: string,
  people: MentionablePerson[],
  storedIds: string[] = [],
): string[] {
  const resolved = new Set([
    ...storedIds.filter((id) => people.some((person) => person.id === id)),
    ...resolveMentionedPeople(text, people).map((person) => person.id),
  ])
  return people.map((person) => person.id).filter((id) => resolved.has(id))
}

export type CommentTextPart =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; person: MentionablePerson }

export function splitCommentMentions(
  text: string,
  people: MentionablePerson[],
): CommentTextPart[] {
  const byId = new Map(people.map((person) => [person.id, person]))
  const parts: CommentTextPart[] = []
  const tokenRe = new RegExp(MENTION_TOKEN_PATTERN.source, 'g')
  let cursor = 0

  for (const match of text.matchAll(tokenRe)) {
    const index = match.index ?? 0
    if (index > cursor) {
      parts.push(...splitBareMentions(text.slice(cursor, index), people, byId))
    }
    const person = byId.get(match[2]) ?? { id: match[2], name: match[1] }
    parts.push({ kind: 'mention', person })
    cursor = index + match[0].length
  }

  if (cursor < text.length) {
    parts.push(...splitBareMentions(text.slice(cursor), people, byId))
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: text }]
}

function splitBareMentions(
  text: string,
  people: MentionablePerson[],
  byId: Map<string, MentionablePerson>,
): CommentTextPart[] {
  if (!text) return []
  const names = [...people]
    .filter((person) => person.name.trim())
    .sort((left, right) => right.name.length - left.name.length)
  if (names.length === 0) return [{ kind: 'text', value: text }]

  const pattern = new RegExp(
    `(^|\\s)@(${names.map((person) => escapeRegExp(person.name)).join('|')})(?=$|[\\s.,!?;:])`,
    'gi',
  )
  const parts: CommentTextPart[] = []
  let cursor = 0
  const nameByLower = new Map(
    names.map((person) => [person.name.toLowerCase(), person]),
  )

  for (const match of text.matchAll(pattern)) {
    const full = match[0]
    const leading = match[1] ?? ''
    const name = match[2] ?? ''
    const index = match.index ?? 0
    const mentionStart = index + leading.length
    if (mentionStart > cursor) {
      parts.push({ kind: 'text', value: text.slice(cursor, mentionStart) })
    }
    const person =
      nameByLower.get(name.toLowerCase()) ??
      people.find((item) => item.name.toLowerCase() === name.toLowerCase())
    if (person && byId.has(person.id)) {
      parts.push({ kind: 'mention', person })
    } else {
      parts.push({ kind: 'text', value: full.slice(leading.length) })
    }
    cursor = index + full.length
  }

  if (cursor < text.length) {
    parts.push({ kind: 'text', value: text.slice(cursor) })
  }
  return parts.length > 0 ? parts : [{ kind: 'text', value: text }]
}
