import type { LucideIcon } from 'lucide-react'
import type { BadgeVariant } from '@/components/ui'

export type SearchKind =
  | 'action'
  | 'page'
  | 'person'
  | 'department'
  | 'team'
  | 'goal'
  | 'cycle'
  | 'scorecard'
  | 'notification'

export type SearchScope =
  | 'all'
  | 'people'
  | 'organisation'
  | 'goals'
  | 'reviews'
  | 'pages'
  | 'actions'

export type SearchItem = {
  id: string
  kind: SearchKind
  scope: SearchScope
  label: string
  description?: string
  keywords: string[]
  path: string
  icon?: LucideIcon
  avatarUrl?: string
  avatarName?: string
  status?: string
  statusVariant?: BadgeVariant
}

export type HighlightRange = {
  start: number
  end: number
}

export type RankedSearchItem = SearchItem & {
  score: number
  highlights: HighlightRange[]
}

export type SearchGroup = {
  id: string
  label: string
  items: RankedSearchItem[]
}

export type ParsedSearchQuery = {
  scope: SearchScope
  text: string
}

export const SEARCH_SCOPES: Array<{ id: SearchScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'people', label: 'People' },
  { id: 'goals', label: 'Goals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'organisation', label: 'Org' },
  { id: 'pages', label: 'Pages' },
]

export const SEARCH_KIND_GROUP: Record<SearchKind, { id: string; label: string }> =
  {
    action: { id: 'action', label: 'Jump To' },
    page: { id: 'page', label: 'Pages' },
    person: { id: 'person', label: 'People' },
    department: { id: 'department', label: 'Departments' },
    team: { id: 'team', label: 'Teams' },
    goal: { id: 'goal', label: 'Goals' },
    cycle: { id: 'cycle', label: 'Cycles' },
    scorecard: { id: 'scorecard', label: 'Reviews' },
    notification: { id: 'notification', label: 'Notifications' },
  }

export const SEARCH_KIND_ORDER: SearchKind[] = [
  'action',
  'page',
  'person',
  'department',
  'team',
  'goal',
  'cycle',
  'scorecard',
  'notification',
]
