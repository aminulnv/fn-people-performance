/**
 * Column model for the People V2 grid.
 *
 * V1 showed all 13 HR fields at all times. Here five columns carry the default
 * read and the rest are opt-in, so the table answers "who is this person and
 * where do they sit" before it answers anything else.
 */
import type { DirectoryPerson, SortKey } from './directory'

export type ColumnId =
  | 'jobTitle'
  | 'department'
  | 'team'
  | 'division'
  | 'manager'
  | 'reports'
  | 'grade'
  | 'tenure'
  | 'startDate'
  | 'email'
  | 'employeeId'
  | 'status'

export type ColumnDef = {
  id: ColumnId
  label: string
  /** Grid track sizing for this column. */
  width: string
  align?: 'end'
  sortKey: SortKey
  /** Excluded from the column picker — status always reads. */
  locked?: boolean
}

export const COLUMNS: ColumnDef[] = [
  /* minmax(0, …) so tracks can shrink when the person panel opens. */
  { id: 'jobTitle', label: 'Role', width: 'minmax(0, 1.1fr)', sortKey: 'jobTitle' },
  { id: 'department', label: 'Department', width: 'minmax(0, 1fr)', sortKey: 'department' },
  { id: 'team', label: 'Team', width: 'minmax(0, 0.9fr)', sortKey: 'team' },
  { id: 'division', label: 'Division', width: 'minmax(0, 0.9fr)', sortKey: 'division' },
  { id: 'manager', label: 'Reports to', width: 'minmax(0, 1fr)', sortKey: 'managerName' },
  { id: 'reports', label: 'Reports', width: '4.5rem', align: 'end', sortKey: 'directReportCount' },
  { id: 'grade', label: 'Grade', width: '4rem', sortKey: 'grade' },
  { id: 'tenure', label: 'Tenure', width: '4.5rem', align: 'end', sortKey: 'tenure' },
  { id: 'startDate', label: 'Started', width: '5.5rem', sortKey: 'startDate' },
  { id: 'email', label: 'Email', width: 'minmax(0, 1.2fr)', sortKey: 'email' },
  { id: 'employeeId', label: 'ID', width: '4rem', align: 'end', sortKey: 'id' },
  { id: 'status', label: 'Status', width: '5rem', sortKey: 'status', locked: true },
]

export const DEFAULT_COLUMNS: ColumnId[] = [
  'jobTitle',
  'department',
  'team',
  'manager',
  'status',
]

export function columnById(id: ColumnId): ColumnDef {
  const column = COLUMNS.find((candidate) => candidate.id === id)
  if (!column) throw new Error(`Unknown directory column: ${id}`)
  return column
}

/** Visible columns, always in canonical order regardless of toggle order. */
export function orderedColumns(visible: ColumnId[]): ColumnDef[] {
  return COLUMNS.filter((column) => visible.includes(column.id))
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatStartDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return '—'
  const [, year, month, day] = match
  return dateFormatter.format(
    new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
  )
}

/** Plain-text value for a cell — used by search-independent exports. */
export function cellText(person: DirectoryPerson, id: ColumnId): string {
  switch (id) {
    case 'jobTitle':
      return person.jobTitle
    case 'department':
      return person.department
    case 'team':
      return person.team
    case 'division':
      return person.division
    case 'manager':
      return person.managerName
    case 'reports':
      return String(person.directReportCount)
    case 'grade':
      return person.grade
    case 'tenure':
      return person.tenureMonths == null ? '' : `${person.tenureMonths} months`
    case 'startDate':
      return person.startDate
    case 'email':
      return person.email
    case 'employeeId':
      return String(person.id)
    case 'status':
      return person.isActive ? 'Active' : 'Inactive'
  }
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Identity columns are always exported, whatever the table is showing. */
export function buildCsv(
  people: DirectoryPerson[],
  visible: ColumnId[],
): string {
  const columns = orderedColumns(visible).filter(
    (column) => column.id !== 'employeeId' && column.id !== 'email',
  )
  const header = ['Employee ID', 'Name', 'Email', ...columns.map((c) => c.label)]
  const rows = people.map((person) =>
    [
      String(person.id),
      person.name,
      person.email,
      ...columns.map((column) => cellText(person, column.id)),
    ]
      .map(escapeCsv)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}
