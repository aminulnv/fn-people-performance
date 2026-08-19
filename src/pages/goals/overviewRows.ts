import type {
  DemoPerson,
  Goal,
  GoalsSnapshot,
  PersonGoals,
} from '@/lib/goals/types'
import { goalCompletion } from '@/lib/goals/weightage'
import {
  canViewPersonGoals,
  goalTitle,
  metricCountLabel,
  personMatchesScope,
  type GoalsDirectoryScope,
} from './goalHelpers'

/** One row per goal — a person with three goals appears on three rows. */
export type GoalRow = {
  key: string
  person: DemoPerson
  status: PersonGoals['status']
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  title: string
  goalId: string
  weight: number
  completion: number
  metric: string
  progressStatus?: Goal['progressStatus']
}

/** First row for a person carries the rowspan; later rows use 0 and skip the owner cell. */
export type GoalRowWithOwnerSpan = GoalRow & {
  ownerRowSpan: number
  isPersonEnd: boolean
}

export type OverviewViewer = {
  id: string
  department: string
  reportIds: string[]
  permissions?: DemoPerson['permissions']
} | null

/** Submission status per person; people without goals contribute no rows. */
export type StatusCounts = {
  goals: number
  draft: number
  sentBack: number
  submitted: number
  approved: number
  incomplete: number
}

export type GoalsListFilter =
  | 'all'
  | 'draft'
  | 'sent_back'
  | 'submitted'
  | 'approved'
  | 'incomplete'

/** People the viewer is allowed to see, narrowed to the selected scope. */
export function peopleInScope(
  snapshot: GoalsSnapshot,
  viewer: OverviewViewer,
  scope: GoalsDirectoryScope,
): DemoPerson[] {
  return snapshot.people.filter(
    (person) =>
      canViewPersonGoals(person, viewer, snapshot.people) &&
      personMatchesScope(person, scope, viewer),
  )
}

/**
 * Build table rows from real goals only.
 *
 * A person with no goals is deliberately absent: inventing a row would force us
 * to show a weight, progress and approval state that does not exist.
 */
export function goalRows(
  snapshot: GoalsSnapshot,
  people: DemoPerson[],
): GoalRow[] {
  return people.flatMap((person): GoalRow[] => {
    const submission = snapshot.byPerson[person.id]
    const status = submission?.status ?? 'draft'
    return (submission?.goals ?? []).map((goal, index) => ({
      key: `${person.id}:${goal.id}`,
      person,
      status,
      postWindowApprovalStage: submission?.postWindowApprovalStage,
      title: goalTitle(goal, index),
      goalId: goal.id,
      weight: goal.weight,
      completion: Math.round(goalCompletion(goal)),
      metric: metricCountLabel(goal),
      progressStatus: goal.progressStatus,
    }))
  })
}

/**
 * Annotate consecutive rows from the same person so the owner column can merge.
 * Callers must keep a person's goals adjacent (e.g. sort by department, then name).
 */
export function withOwnerRowSpans(rows: GoalRow[]): GoalRowWithOwnerSpan[] {
  const result: GoalRowWithOwnerSpan[] = []
  let index = 0
  while (index < rows.length) {
    const personId = rows[index].person.id
    let span = 1
    while (
      index + span < rows.length &&
      rows[index + span].person.id === personId
    ) {
      span += 1
    }
    for (let offset = 0; offset < span; offset += 1) {
      result.push({
        ...rows[index + offset],
        ownerRowSpan: offset === 0 ? span : 0,
        isPersonEnd: offset === span - 1,
      })
    }
    index += span
  }
  return result
}

export function matchesStatusFilter(
  status: PersonGoals['status'],
  filter: GoalsListFilter | null,
): boolean {
  if (!filter || filter === 'all') return true
  if (filter === 'incomplete') {
    return status === 'incomplete' || status === 'not_eligible'
  }
  return status === filter
}

/**
 * Goals are counted per goal; every other tile counts people, because approval
 * state belongs to a person's submission rather than to individual goals.
 */
export function statusCounts(
  snapshot: GoalsSnapshot,
  people: DemoPerson[],
): StatusCounts {
  const counts: StatusCounts = {
    goals: 0,
    draft: 0,
    sentBack: 0,
    submitted: 0,
    approved: 0,
    incomplete: 0,
  }
  for (const person of people) {
    const submission = snapshot.byPerson[person.id]
    counts.goals += submission?.goals.length ?? 0
    switch (submission?.status ?? 'draft') {
      case 'draft':
        counts.draft += 1
        break
      case 'sent_back':
        counts.sentBack += 1
        break
      case 'submitted':
        counts.submitted += 1
        break
      case 'approved':
        counts.approved += 1
        break
      case 'incomplete':
      case 'not_eligible':
        counts.incomplete += 1
        break
    }
  }
  return counts
}

/** People matching the active filter who have not added any goals yet. */
export function peopleWithoutGoals(
  snapshot: GoalsSnapshot,
  people: DemoPerson[],
  filter: GoalsListFilter | null = null,
): DemoPerson[] {
  return people.filter((person) => {
    const submission = snapshot.byPerson[person.id]
    if ((submission?.goals.length ?? 0) > 0) return false
    return matchesStatusFilter(submission?.status ?? 'draft', filter)
  })
}

const FILTER_LABELS: Record<Exclude<GoalsListFilter, 'all'>, string> = {
  draft: 'in draft',
  sent_back: 'sent back',
  submitted: 'pending approval',
  approved: 'approved',
  incomplete: 'incomplete',
}

/**
 * Explain an empty goals table instead of leaving a blank surface.
 *
 * `ownScope` mirrors the profile page placeholder so a person with nothing yet
 * is invited to add a goal rather than shown a row that has no data behind it.
 */
export function describeEmptyGoalsList(input: {
  scope: GoalsDirectoryScope
  peopleInScope: number
  waitingPeople: number
  hasQuery: boolean
  statusFilter: GoalsListFilter | null
  canAddOwnGoals: boolean
}): { title: string; description: string; offerAdd: boolean } {
  if (input.peopleInScope === 0) {
    return {
      title: 'No people in this scope',
      description:
        input.scope === 'reports'
          ? 'You have no direct reports in this cycle.'
          : 'No one is available in this scope.',
      offerAdd: false,
    }
  }

  if (input.hasQuery) {
    return {
      title: 'No matches',
      description: 'Try a different search or status filter.',
      offerAdd: false,
    }
  }

  if (input.scope === 'mine') {
    return {
      title: 'No goals yet',
      description: input.canAddOwnGoals
        ? 'Add a goal to get started. Each needs measurements, and weights must total 100%.'
        : 'Goals cannot be added for this cycle right now.',
      offerAdd: input.canAddOwnGoals,
    }
  }

  if (input.statusFilter && input.statusFilter !== 'all') {
    const label = FILTER_LABELS[input.statusFilter]
    if (input.waitingPeople === 0) {
      return {
        title: 'No goals to show',
        description: `No one in this scope is ${label} right now.`,
        offerAdd: false,
      }
    }
    return {
      title: 'No goals to show',
      description:
        input.waitingPeople === 1
          ? `1 person in this scope is ${label} but has not added any goals yet.`
          : `${input.waitingPeople} people in this scope are ${label} but have not added any goals yet.`,
      offerAdd: false,
    }
  }

  return {
    title: 'No goals yet',
    description:
      input.waitingPeople === 1
        ? '1 person in this scope has not added goals for this cycle yet.'
        : `${input.waitingPeople} people in this scope have not added goals for this cycle yet.`,
    offerAdd: false,
  }
}
