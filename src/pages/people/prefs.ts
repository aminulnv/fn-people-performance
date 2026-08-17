export type TableDensity = 'comfortable' | 'condensed'

const DENSITY_KEY = 'pd.people.tableDensity'

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

export function readTableDensity(): TableDensity {
  return readStorage(DENSITY_KEY) === 'condensed' ? 'condensed' : 'comfortable'
}

export function writeTableDensity(density: TableDensity) {
  writeStorage(DENSITY_KEY, density)
}
