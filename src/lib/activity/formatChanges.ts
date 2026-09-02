import {
  activityEventLabel,
  type ActivityChange,
  type ActivityEvent,
} from '@/lib/activity/types'

export type FormattedActivityChange = {
  field: string
  from: string
  to: string
}

const FIELD_LABELS: Record<string, string> = {
  appeal: 'Appeal',
  cascadedFromGoalId: 'Cascades from',
  calibration: 'Calibration',
  comment: 'Comment',
  currentValue: 'Progress',
  delegateEmployeeId: 'Delegate',
  department: 'Department',
  description: 'Title',
  details: 'Details',
  division: 'Division',
  email: 'Email',
  employeeId: 'Employee ID',
  endsOn: 'Ends',
  goal: 'Goal',
  goalCountPolicy: 'Goal count',
  grade: 'Grade',
  jobGrade: 'Job grade',
  jobTitle: 'Job title',
  joiningDate: 'Start date',
  late: 'Late',
  lateJustification: 'Late justification',
  managerId: 'Manager',
  measure: 'Metric',
  milestone: 'Milestone',
  name: 'Name',
  overrideReason: 'Override reason',
  ownerId: 'Owner',
  postWindowGoalPolicy: 'After-deadline policy',
  profileKey: 'Access profile',
  progress: 'Progress',
  proof: 'Proof',
  proofUrl: 'Proof',
  reason: 'Reason',
  reviewTypes: 'Review types',
  site: 'Site',
  stagesConfig: 'Stages',
  startsOn: 'Starts',
  status: 'Status',
  targetValue: 'Target',
  team: 'Team',
  title: 'Title',
  weight: 'Weight',
}

const GRADE_LABELS: Record<string, string> = {
  exceptional: 'Exceptional',
  exceeding: 'Exceeding',
  performing: 'Performing',
  developing: 'Developing',
  unsatisfactory: 'Unsatisfactory',
  leave: 'Leave',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  sent_back: 'Sent back',
  approved: 'Approved',
  incomplete: 'Incomplete',
  not_started: 'Not started',
  self_in_progress: 'Self-review in progress',
  self_submitted: 'Self-review submitted',
  manager_in_progress: 'Manager review in progress',
  manager_submitted: 'Manager review submitted',
  in_calibration: 'In calibration',
  released_to_managers: 'Released to managers',
  released_to_employees: 'Released to employees',
  appealed: 'Appealed',
  active: 'Active',
  inactive: 'Inactive',
}

type GoalLike = {
  description?: unknown
  details?: unknown
  weight?: unknown
  ownerId?: unknown
  cascadedFromGoalId?: unknown
  measurements?: unknown
  comments?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isGoalLike(value: unknown): value is GoalLike {
  return isRecord(value) && 'measurements' in value
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function titleCaseField(field: string): string {
  return field
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function activityFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? titleCaseField(field)
}

function excerpt(value: string, max = 140): string {
  const text = value.trim().replace(/\s+/g, ' ')
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function isNumericChange(from: string, to: string): boolean {
  const numeric = /^-?\d+(?:\.\d+)?%?$/
  return numeric.test(from) && numeric.test(to)
}

/** Measure names that just repeat the goal title add no information. */
function isRedundantSubject(subject: string, goalTitle?: string): boolean {
  const name = normalizeTitle(subject)
  if (!name) return true
  if (name === 'metric' || name === 'milestone' || name === 'progress') return true
  const goal = goalTitle ? normalizeTitle(goalTitle) : ''
  return Boolean(goal && name === goal)
}

/** Prefer “Progress” over repeating the goal title as a field name. */
export function activityChangeFieldLabel(
  field: string,
  options?: { goalTitle?: string; from?: string; to?: string },
): string {
  const [subject, attribute] = field.split(' · ')
  if (attribute) {
    const attrLabel = activityFieldLabel(attribute)
    if (isRedundantSubject(subject, options?.goalTitle)) return attrLabel
    return `${excerpt(subject, 42)} · ${attrLabel}`
  }
  if (isRedundantSubject(field, options?.goalTitle)) {
    return isNumericChange(options?.from ?? '', options?.to ?? '')
      ? 'Progress'
      : activityFieldLabel(field)
  }
  return excerpt(activityFieldLabel(field), 42)
}

/** Goal title from metadata, or the last quoted title in the summary. */
export function activityGoalTitle(event: ActivityEvent): string {
  const metaTitle = event.metadata?.title
  if (typeof metaTitle === 'string' && metaTitle.trim()) return metaTitle.trim()
  const quoted = [...event.summary.matchAll(/[“"]([^”"]+)[”"]/g)].map((match) =>
    match[1].trim(),
  )
  if (quoted.length >= 2 && normalizeTitle(quoted[0]) === normalizeTitle(quoted[1])) {
    return quoted[1]
  }
  if (quoted.length > 0) return quoted[quoted.length - 1]
  return ''
}

/** One readable sentence. Collapses “Updated title on title” and shortens quotes. */
export function activityDisplaySummary(event: ActivityEvent): string {
  const raw = event.summary.trim()
  if (!raw) return ''
  const match = raw.match(/^Updated [“"](.+?)[”"] on [“"](.+?)[”"]$/)
  if (match) {
    const metric = match[1].trim()
    const goal = excerpt(match[2].trim(), 72)
    if (normalizeTitle(metric) === normalizeTitle(match[2])) {
      return `Updated progress on “${goal}”`
    }
    return `Updated “${excerpt(metric, 42)}” on “${goal}”`
  }
  return raw.replace(/[“"]([^”"]{73,})[”"]/g, (_, title: string) => `“${excerpt(title, 72)}”`)
}

function formatScalar(field: string, value: unknown): string {
  if (value == null || value === '') return '-'
  if (typeof value === 'boolean') {
    if (field === 'late') return value ? 'Yes' : 'No'
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'number') {
    if (field === 'weight' || field.endsWith('Weight')) return `${value}%`
    return String(value)
  }
  if (typeof value === 'string') {
    if (GRADE_LABELS[value]) return GRADE_LABELS[value]
    if (STATUS_LABELS[value]) return STATUS_LABELS[value]
    if (field === 'proofUrl' || field === 'proof') {
      try {
        return new URL(value).hostname
      } catch {
        return excerpt(value, 64)
      }
    }
    return excerpt(value)
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? 'None' : `${value.length} items`
  }
  if (isGoalLike(value)) {
    return excerpt(String(value.description || 'Goal'), 64)
  }
  return 'Updated'
}

function measureName(measure: Record<string, unknown>): string {
  const title = String(measure.measureTitle || measure.title || '').trim()
  if (title) return title
  return measure.kind === 'milestone' ? 'Milestone' : 'Metric'
}

function expandMeasurements(
  fromList: unknown,
  toList: unknown,
): FormattedActivityChange[] {
  const fromItems = Array.isArray(fromList) ? fromList.filter(isRecord) : []
  const toItems = Array.isArray(toList) ? toList.filter(isRecord) : []
  const fromById = new Map(
    fromItems.map((item) => [String(item.id ?? ''), item]),
  )
  const toById = new Map(toItems.map((item) => [String(item.id ?? ''), item]))
  const rows: FormattedActivityChange[] = []

  for (const measure of toItems) {
    const id = String(measure.id ?? '')
    const previous = fromById.get(id)
    const name = measureName(measure)
    if (!previous) {
      rows.push({ field: name, from: '-', to: 'Added' })
      continue
    }
    const fields: Array<[string, string]> = [
      ['title', 'Title'],
      ['weight', 'Weight'],
      ['targetValue', 'Target'],
      ['startValue', 'Start'],
      ['currentValue', 'Progress'],
      ['complete', 'Complete'],
      ['proofUrl', 'Proof'],
      ['direction', 'Direction'],
      ['unit', 'Unit'],
    ]
    for (const [key, label] of fields) {
      if (same(previous[key], measure[key])) continue
      rows.push({
        field: `${name} · ${label}`,
        from: formatScalar(key, previous[key]),
        to: formatScalar(key, measure[key]),
      })
    }
  }

  for (const measure of fromItems) {
    const id = String(measure.id ?? '')
    if (toById.has(id)) continue
    rows.push({ field: measureName(measure), from: 'Removed', to: '-' })
  }

  return rows
}

function expandGoalShape(
  from: GoalLike,
  to: GoalLike,
): FormattedActivityChange[] {
  const rows: FormattedActivityChange[] = []
  const pairs: Array<[keyof GoalLike, string]> = [
    ['description', 'title'],
    ['details', 'details'],
    ['weight', 'weight'],
    ['ownerId', 'ownerId'],
    ['cascadedFromGoalId', 'cascadedFromGoalId'],
  ]
  for (const [key, field] of pairs) {
    if (same(from[key], to[key])) continue
    rows.push({
      field: activityFieldLabel(field),
      from: formatScalar(field, from[key]),
      to: formatScalar(field, to[key]),
    })
  }
  rows.push(...expandMeasurements(from.measurements, to.measurements))
  return rows
}

function expandObjectPair(
  field: string,
  from: unknown,
  to: unknown,
): FormattedActivityChange[] {
  if (isGoalLike(from) || isGoalLike(to)) {
    return expandGoalShape(
      isGoalLike(from) ? from : {},
      isGoalLike(to) ? to : {},
    )
  }
  if (isRecord(from) && isRecord(to)) {
    const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])]
    const nested: FormattedActivityChange[] = []
    for (const key of keys) {
      if (same(from[key], to[key])) continue
      if (isRecord(from[key]) || isRecord(to[key]) || Array.isArray(from[key]) || Array.isArray(to[key])) {
        nested.push({
          field: `${activityFieldLabel(field)} · ${activityFieldLabel(key)}`,
          from: formatScalar(key, from[key]),
          to: formatScalar(key, to[key]),
        })
        continue
      }
      nested.push({
        field: `${activityFieldLabel(field)} · ${activityFieldLabel(key)}`,
        from: formatScalar(key, from[key]),
        to: formatScalar(key, to[key]),
      })
    }
    if (nested.length > 0) return nested
  }
  return [
    {
      field: activityFieldLabel(field),
      from: formatScalar(field, from),
      to: formatScalar(field, to),
    },
  ]
}

/** Turn stored changes into short, human rows. Never surfaces raw JSON. */
export function formatActivityChanges(
  changes: ActivityChange[],
  options?: { goalTitle?: string },
): FormattedActivityChange[] {
  const rows: FormattedActivityChange[] = []
  for (const change of changes) {
    const expanded = expandObjectPair(change.field, change.from, change.to)
    for (const row of expanded) {
      if (row.from === row.to) continue
      rows.push({
        ...row,
        field: activityChangeFieldLabel(row.field, {
          goalTitle: options?.goalTitle,
          from: row.from,
          to: row.to,
        }),
      })
    }
  }
  return rows
}

export function activityHeadline(event: ActivityEvent): string {
  if (event.eventKey === 'goal_submission.submitted' && event.metadata.late) {
    return 'Submitted goals after the deadline'
  }
  if (event.eventKey === 'goal.comment_added') {
    return 'Commented on a goal'
  }
  if (event.eventKey === 'goal.comment_updated') {
    return 'Edited a comment'
  }
  if (event.eventKey === 'goal.comment_deleted') {
    return 'Deleted a comment'
  }
  return activityEventLabel(event.eventKey)
}
