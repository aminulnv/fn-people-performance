/**
 * People V2 directory domain logic.
 *
 * The employees API returns flat HR rows. Everything a reader actually needs to
 * judge an org — tenure, span of control, where a person sits, what data is
 * missing — is derived here so the UI layer stays presentational.
 */
import type { PlatformEmployee } from '@/lib/employees/types'

/** Facet value used when a person has no value for a grouping dimension. */
export const UNASSIGNED = '__unassigned__'

export type TenureBandId = 'lt3m' | 'lt1y' | 'lt3y' | 'lt5y' | 'gte5y' | 'unknown'

export const TENURE_BANDS: { id: TenureBandId; label: string }[] = [
  { id: 'lt3m', label: 'Under 3 months' },
  { id: 'lt1y', label: '3 to 12 months' },
  { id: 'lt3y', label: '1 to 3 years' },
  { id: 'lt5y', label: '3 to 5 years' },
  { id: 'gte5y', label: '5 years or more' },
  { id: 'unknown', label: 'No start date' },
]

export type DataGapId = 'manager' | 'grade' | 'team' | 'hrbp' | 'startDate'

export const DATA_GAPS: { id: DataGapId; label: string }[] = [
  { id: 'manager', label: 'No reporting line' },
  { id: 'grade', label: 'No job grade' },
  { id: 'team', label: 'No team' },
  { id: 'hrbp', label: 'No HRBP' },
  { id: 'startDate', label: 'No start date' },
]

export type DirectoryPerson = {
  id: number
  name: string
  email: string
  jobTitle: string
  grade: string
  division: string
  department: string
  team: string
  managerName: string
  managerId?: number
  departmentHead: string
  hrbp: string
  startDate: string
  /** Whole months since start date; null when the start date is missing. */
  tenureMonths: number | null
  tenureLabel: string
  tenureBand: TenureBandId
  directReportCount: number
  isActive: boolean
  gaps: DataGapId[]
  /** Pre-lowercased haystack for token search. */
  searchText: string
}

export type DirectoryStats = {
  total: number
  active: number
  inactive: number
  joinedLast90Days: number
  managers: number
  withGaps: number
}

const collator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
})

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Whole calendar months between two dates, floored at 0. */
function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) -
    (to.getUTCDate() < from.getUTCDate() ? 1 : 0)
  return Math.max(0, months)
}

function tenureBandOf(months: number | null): TenureBandId {
  if (months == null) return 'unknown'
  if (months < 3) return 'lt3m'
  if (months < 12) return 'lt1y'
  if (months < 36) return 'lt3y'
  if (months < 60) return 'lt5y'
  return 'gte5y'
}

function tenureLabelOf(months: number | null): string {
  if (months == null) return '—'
  if (months < 1) return 'New'
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years}y` : `${years}y ${rest}mo`
}

function gapsOf(employee: PlatformEmployee): DataGapId[] {
  const gaps: DataGapId[] = []
  if (!employee.reportsToName.trim()) gaps.push('manager')
  if (!employee.jobGrade.trim()) gaps.push('grade')
  if (!employee.team.trim()) gaps.push('team')
  if (!employee.hrbpName.trim()) gaps.push('hrbp')
  if (!employee.startDate.trim()) gaps.push('startDate')
  return gaps
}

export function buildDirectory(
  employees: PlatformEmployee[],
  now: Date = new Date(),
): DirectoryPerson[] {
  const reportCounts = new Map<number, number>()
  for (const employee of employees) {
    if (employee.reportsToId == null) continue
    reportCounts.set(
      employee.reportsToId,
      (reportCounts.get(employee.reportsToId) ?? 0) + 1,
    )
  }

  return employees.map((employee) => {
    const startedOn = parseIsoDate(employee.startDate)
    const tenureMonths = startedOn ? monthsBetween(startedOn, now) : null
    const gaps = gapsOf(employee)

    return {
      id: employee.employeeId,
      name: employee.fullName,
      email: employee.email,
      jobTitle: employee.jobTitle,
      grade: employee.jobGrade,
      division: employee.division,
      department: employee.department,
      team: employee.team,
      managerName: employee.reportsToName,
      managerId: employee.reportsToId,
      departmentHead: employee.departmentHeadName,
      hrbp: employee.hrbpName,
      startDate: employee.startDate,
      tenureMonths,
      tenureLabel: tenureLabelOf(tenureMonths),
      tenureBand: tenureBandOf(tenureMonths),
      directReportCount: reportCounts.get(employee.employeeId) ?? 0,
      isActive: employee.isActive,
      gaps,
      searchText: [
        employee.employeeId,
        employee.fullName,
        employee.email,
        employee.jobTitle,
        employee.jobGrade,
        employee.division,
        employee.department,
        employee.team,
        employee.reportsToName,
        employee.departmentHeadName,
        employee.hrbpName,
        employee.startDate,
        employee.isActive ? 'active' : 'inactive',
      ]
        .join(' ')
        .toLowerCase(),
    }
  })
}

export function summarise(people: DirectoryPerson[]): DirectoryStats {
  let active = 0
  let joinedLast90Days = 0
  let managers = 0
  let withGaps = 0

  for (const person of people) {
    if (person.isActive) active += 1
    if (person.tenureMonths != null && person.tenureMonths < 3) {
      joinedLast90Days += 1
    }
    if (person.directReportCount > 0) managers += 1
    if (person.gaps.length > 0) withGaps += 1
  }

  return {
    total: people.length,
    active,
    inactive: people.length - active,
    joinedLast90Days,
    managers,
    withGaps,
  }
}

/* ── Faceted filtering ─────────────────────────────────────────────── */

export type FacetId =
  | 'status'
  | 'division'
  | 'department'
  | 'team'
  | 'grade'
  | 'tenure'
  | 'gap'

export type FacetSelections = Record<FacetId, string[]>

export const FACET_ORDER: FacetId[] = [
  'department',
  'team',
  'grade',
  'tenure',
  'gap',
  'division',
  'status',
]

export const FACET_LABELS: Record<FacetId, string> = {
  status: 'Status',
  division: 'Division',
  department: 'Department',
  team: 'Team',
  grade: 'Job grade',
  tenure: 'Tenure',
  gap: 'Needs attention',
}

export function emptySelections(): FacetSelections {
  return {
    status: [],
    division: [],
    department: [],
    team: [],
    grade: [],
    tenure: [],
    gap: [],
  }
}

export function countSelections(selections: FacetSelections): number {
  return FACET_ORDER.reduce((sum, id) => sum + selections[id].length, 0)
}

function facetValuesOf(person: DirectoryPerson, facet: FacetId): string[] {
  switch (facet) {
    case 'status':
      return [person.isActive ? 'active' : 'inactive']
    case 'division':
      return [person.division.trim() || UNASSIGNED]
    case 'department':
      return [person.department.trim() || UNASSIGNED]
    case 'team':
      return [person.team.trim() || UNASSIGNED]
    case 'grade':
      return [person.grade.trim() || UNASSIGNED]
    case 'tenure':
      return [person.tenureBand]
    case 'gap':
      return person.gaps
  }
}

function matchesFacet(
  person: DirectoryPerson,
  facet: FacetId,
  selected: string[],
): boolean {
  if (selected.length === 0) return true
  const values = facetValuesOf(person, facet)
  return selected.some((value) => values.includes(value))
}

export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

function matchesQuery(person: DirectoryPerson, tokens: string[]): boolean {
  return tokens.every((token) => person.searchText.includes(token))
}

export function filterPeople(
  people: DirectoryPerson[],
  query: string,
  selections: FacetSelections,
  /** Facet to leave unapplied — used to compute that facet's own counts. */
  exceptFacet?: FacetId,
): DirectoryPerson[] {
  const tokens = tokenize(query)
  return people.filter((person) => {
    if (!matchesQuery(person, tokens)) return false
    return FACET_ORDER.every(
      (facet) =>
        facet === exceptFacet || matchesFacet(person, facet, selections[facet]),
    )
  })
}

export type FacetOption = {
  value: string
  label: string
  count: number
  selected: boolean
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

export function facetValueLabel(facet: FacetId, value: string): string {
  if (value === UNASSIGNED) return 'Unassigned'
  if (facet === 'status') return STATUS_LABELS[value] ?? value
  if (facet === 'tenure') {
    return TENURE_BANDS.find((band) => band.id === value)?.label ?? value
  }
  if (facet === 'gap') {
    return DATA_GAPS.find((gap) => gap.id === value)?.label ?? value
  }
  return value
}

/** Fixed display order for facets whose values are enumerable. */
const ORDERED_VALUES: Partial<Record<FacetId, string[]>> = {
  status: ['active', 'inactive'],
  tenure: TENURE_BANDS.map((band) => band.id),
  gap: DATA_GAPS.map((gap) => gap.id),
}

/**
 * Counts stay live: each facet is counted against the set filtered by every
 * *other* facet, so a count never promises rows the filter cannot deliver.
 */
export function buildFacetOptions(
  people: DirectoryPerson[],
  query: string,
  selections: FacetSelections,
): Record<FacetId, FacetOption[]> {
  const result = {} as Record<FacetId, FacetOption[]>

  for (const facet of FACET_ORDER) {
    const scope = filterPeople(people, query, selections, facet)
    const counts = new Map<string, number>()
    for (const person of scope) {
      for (const value of facetValuesOf(person, facet)) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }

    const selected = selections[facet]
    // Keep selected values visible even when their live count drops to zero.
    for (const value of selected) {
      if (!counts.has(value)) counts.set(value, 0)
    }

    const fixedOrder = ORDERED_VALUES[facet]
    const values = [...counts.keys()].sort((a, b) => {
      if (fixedOrder) return fixedOrder.indexOf(a) - fixedOrder.indexOf(b)
      if (a === UNASSIGNED) return 1
      if (b === UNASSIGNED) return -1
      return collator.compare(a, b)
    })

    result[facet] = values.map((value) => ({
      value,
      label: facetValueLabel(facet, value),
      count: counts.get(value) ?? 0,
      selected: selected.includes(value),
    }))
  }

  return result
}

export function toggleFacetValue(
  selections: FacetSelections,
  facet: FacetId,
  value: string,
): FacetSelections {
  const current = selections[facet]
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
  return { ...selections, [facet]: next }
}

/* ── Sorting ───────────────────────────────────────────────────────── */

export type SortKey =
  | 'name'
  | 'jobTitle'
  | 'grade'
  | 'division'
  | 'department'
  | 'team'
  | 'managerName'
  | 'directReportCount'
  | 'tenure'
  | 'startDate'
  | 'email'
  | 'id'
  | 'status'

export type SortDirection = 'asc' | 'desc'

export type Sort = { key: SortKey; direction: SortDirection }

export const SORT_KEYS: SortKey[] = [
  'name',
  'jobTitle',
  'grade',
  'division',
  'department',
  'team',
  'managerName',
  'directReportCount',
  'tenure',
  'startDate',
  'email',
  'id',
  'status',
]

export const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  jobTitle: 'Role',
  grade: 'Job grade',
  division: 'Division',
  department: 'Department',
  team: 'Team',
  managerName: 'Reports to',
  directReportCount: 'Direct reports',
  tenure: 'Tenure',
  startDate: 'Start date',
  email: 'Email',
  id: 'Employee ID',
  status: 'Status',
}

/** Keys where the useful first read is largest-first. */
export const DESCENDING_FIRST: SortKey[] = [
  'tenure',
  'directReportCount',
  'startDate',
]

function sortValue(person: DirectoryPerson, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return person.name
    case 'jobTitle':
      return person.jobTitle
    case 'grade':
      return person.grade
    case 'division':
      return person.division
    case 'department':
      return person.department
    case 'team':
      return person.team
    case 'managerName':
      return person.managerName
    case 'directReportCount':
      return person.directReportCount
    case 'tenure':
      return person.tenureMonths ?? Number.NaN
    case 'startDate':
      return person.startDate
    case 'email':
      return person.email
    case 'id':
      return person.id
    case 'status':
      return person.isActive ? 0 : 1
  }
}

function isBlank(value: string | number): boolean {
  return typeof value === 'number'
    ? Number.isNaN(value)
    : value.trim().length === 0
}

/** Blanks always sink to the bottom so reversing a sort never surfaces gaps. */
export function sortPeople(
  people: DirectoryPerson[],
  sort: Sort,
): DirectoryPerson[] {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...people].sort((a, b) => {
    const left = sortValue(a, sort.key)
    const right = sortValue(b, sort.key)
    const leftBlank = isBlank(left)
    const rightBlank = isBlank(right)
    if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
    if (leftBlank && rightBlank) return a.id - b.id

    const delta =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : collator.compare(String(left), String(right))
    return delta === 0 ? a.id - b.id : delta * factor
  })
}

/* ── Grouping ──────────────────────────────────────────────────────── */

export type GroupKey =
  | 'none'
  | 'division'
  | 'department'
  | 'team'
  | 'manager'
  | 'status'
  | 'tenure'
  | 'grade'

export const GROUP_LABELS: Record<GroupKey, string> = {
  none: 'No grouping',
  division: 'Division',
  department: 'Department',
  team: 'Team',
  manager: 'Reports to',
  status: 'Status',
  tenure: 'Tenure',
  grade: 'Job grade',
}

export type DirectoryGroup = {
  id: string
  label: string
  people: DirectoryPerson[]
}

function groupValueOf(person: DirectoryPerson, key: GroupKey): string {
  switch (key) {
    case 'none':
      return ''
    case 'division':
      return person.division.trim()
    case 'department':
      return person.department.trim()
    case 'team':
      return person.team.trim()
    case 'manager':
      return person.managerName.trim()
    case 'status':
      return person.isActive ? 'Active' : 'Inactive'
    case 'tenure':
      return person.tenureBand
    case 'grade':
      return person.grade.trim()
  }
}

const GROUP_ORDER: Partial<Record<GroupKey, string[]>> = {
  status: ['Active', 'Inactive'],
  tenure: TENURE_BANDS.map((band) => band.id),
}

export function groupPeople(
  people: DirectoryPerson[],
  key: GroupKey,
): DirectoryGroup[] {
  if (key === 'none') {
    return [{ id: 'all', label: '', people }]
  }

  const buckets = new Map<string, DirectoryPerson[]>()
  for (const person of people) {
    const value = groupValueOf(person, key) || UNASSIGNED
    const bucket = buckets.get(value)
    if (bucket) bucket.push(person)
    else buckets.set(value, [person])
  }

  const fixedOrder = GROUP_ORDER[key]
  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (fixedOrder) return fixedOrder.indexOf(a) - fixedOrder.indexOf(b)
      if (a === UNASSIGNED) return 1
      if (b === UNASSIGNED) return -1
      return collator.compare(a, b)
    })
    .map(([value, bucket]) => ({
      id: value,
      label:
        value === UNASSIGNED
          ? 'Unassigned'
          : key === 'tenure'
            ? (TENURE_BANDS.find((band) => band.id === value)?.label ?? value)
            : value,
      people: bucket,
    }))
}

/* ── Reporting line ────────────────────────────────────────────────── */

/** Chain from the top of the org down to (but excluding) the person. */
export function reportingChain(
  person: DirectoryPerson,
  byId: Map<number, DirectoryPerson>,
): DirectoryPerson[] {
  const chain: DirectoryPerson[] = []
  const seen = new Set<number>([person.id])
  let cursor = person.managerId != null ? byId.get(person.managerId) : undefined

  while (cursor && !seen.has(cursor.id)) {
    chain.unshift(cursor)
    seen.add(cursor.id)
    cursor = cursor.managerId != null ? byId.get(cursor.managerId) : undefined
  }

  return chain
}

export function directReportsOf(
  person: DirectoryPerson,
  people: DirectoryPerson[],
): DirectoryPerson[] {
  return people
    .filter((candidate) => candidate.managerId === person.id)
    .sort((a, b) => collator.compare(a.name, b.name))
}
