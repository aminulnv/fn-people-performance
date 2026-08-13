/**
 * Local view preferences for People V2.
 *
 * Filters live in the URL so a view can be shared; density and column choice
 * are personal habits, so they stay on the device instead.
 */
import { COLUMNS, DEFAULT_COLUMNS, type ColumnId } from './columns'

export type Density = 'comfortable' | 'compact'

const DENSITY_KEY = 'pd.people-v2.density'
const COLUMNS_KEY = 'pd.people-v2.columns'
const FILTERS_OPEN_KEY = 'pd.people-v2.filtersOpen'

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private browsing or a full quota — the view still works, just not sticky.
  }
}

export function readDensity(): Density {
  return readStorage(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
}

export function writeDensity(density: Density) {
  writeStorage(DENSITY_KEY, density)
}

/** Desktop filter rail; defaults open so first visits still show facets. */
export function readFiltersOpen(): boolean {
  return readStorage(FILTERS_OPEN_KEY) !== '0'
}

export function writeFiltersOpen(open: boolean) {
  writeStorage(FILTERS_OPEN_KEY, open ? '1' : '0')
}

const LOCKED_COLUMNS = COLUMNS.filter((column) => column.locked).map(
  (column) => column.id,
)

function isColumnId(value: string): value is ColumnId {
  return COLUMNS.some((column) => column.id === value)
}

export function normaliseColumns(ids: string[]): ColumnId[] {
  const valid = ids.filter(isColumnId)
  const withLocked = [...new Set([...valid, ...LOCKED_COLUMNS])]
  return withLocked.length > LOCKED_COLUMNS.length ? withLocked : DEFAULT_COLUMNS
}

export function readColumns(): ColumnId[] {
  const raw = readStorage(COLUMNS_KEY)
  if (!raw) return DEFAULT_COLUMNS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_COLUMNS
    const normalised = normaliseColumns(
      parsed.filter((id): id is string => typeof id === 'string'),
    )
    // Migrate the previous default (tenure, no team) to the current one.
    const isLegacyDefault =
      normalised.length === 5 &&
      normalised.includes('tenure') &&
      !normalised.includes('team') &&
      normalised.includes('jobTitle') &&
      normalised.includes('department') &&
      normalised.includes('manager') &&
      normalised.includes('status')
    if (isLegacyDefault) {
      writeColumns(DEFAULT_COLUMNS)
      return DEFAULT_COLUMNS
    }
    return normalised
  } catch {
    return DEFAULT_COLUMNS
  }
}

export function writeColumns(ids: ColumnId[]) {
  writeStorage(COLUMNS_KEY, JSON.stringify(ids))
}
