/**
 * View state for People V2.
 *
 * Search, facets, sort, grouping and the open person live in the URL, so any
 * view a person is looking at can be pasted into a message and reopened.
 */
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_COLUMNS, type ColumnId } from './columns'
import {
  DESCENDING_FIRST,
  FACET_ORDER,
  GROUP_LABELS,
  SORT_KEYS,
  countSelections,
  emptySelections,
  toggleFacetValue,
  type FacetId,
  type FacetSelections,
  type GroupKey,
  type Sort,
  type SortKey,
} from './directory'
import {
  normaliseColumns,
  readColumns,
  readDensity,
  writeColumns,
  writeDensity,
  type Density,
} from './prefs'

const DEFAULT_SORT: Sort = { key: 'department', direction: 'asc' }

/** Who the directory is scoped to before facets narrow it further. */
export type Scope = 'all' | 'reports' | 'department'

const GROUP_KEYS = Object.keys(GROUP_LABELS) as GroupKey[]

function parseSort(params: URLSearchParams): Sort {
  const key = params.get('sort')
  if (!key || !SORT_KEYS.includes(key as SortKey)) return DEFAULT_SORT
  return {
    key: key as SortKey,
    direction: params.get('dir') === 'desc' ? 'desc' : 'asc',
  }
}

export function useDirectoryView() {
  const [params, setParams] = useSearchParams()
  const [density, setDensityState] = useState<Density>(readDensity)
  const [columns, setColumnsState] = useState<ColumnId[]>(readColumns)

  const applyParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          mutate(next)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const query = params.get('q') ?? ''

  const selections = useMemo<FacetSelections>(() => {
    const next = emptySelections()
    for (const facet of FACET_ORDER) {
      const values = params.getAll(facet).filter(Boolean)
      if (values.length > 0) next[facet] = values
    }
    return next
  }, [params])

  const sort = useMemo(() => parseSort(params), [params])

  const groupParam = params.get('group')
  const groupBy: GroupKey = GROUP_KEYS.includes(groupParam as GroupKey)
    ? (groupParam as GroupKey)
    : 'none'

  const peekParam = Number(params.get('person'))
  const peekId = Number.isInteger(peekParam) && peekParam > 0 ? peekParam : null

  const scopeParam = params.get('scope')
  const scope: Scope =
    scopeParam === 'reports' || scopeParam === 'department' ? scopeParam : 'all'

  const setQuery = useCallback(
    (value: string) => {
      applyParams((next) => {
        if (value) next.set('q', value)
        else next.delete('q')
      })
    },
    [applyParams],
  )

  const writeSelections = useCallback(
    (nextSelections: FacetSelections) => {
      applyParams((next) => {
        for (const facet of FACET_ORDER) {
          next.delete(facet)
          for (const value of nextSelections[facet]) next.append(facet, value)
        }
      })
    },
    [applyParams],
  )

  const toggleFacet = useCallback(
    (facet: FacetId, value: string) => {
      writeSelections(toggleFacetValue(selections, facet, value))
    },
    [selections, writeSelections],
  )

  const setFacet = useCallback(
    (facet: FacetId, values: string[]) => {
      writeSelections({ ...selections, [facet]: values })
    },
    [selections, writeSelections],
  )

  const setScope = useCallback(
    (next: Scope) => {
      applyParams((params_) => {
        if (next === 'all') params_.delete('scope')
        else params_.set('scope', next)
      })
    },
    [applyParams],
  )

  const clearFilters = useCallback(() => {
    applyParams((next) => {
      next.delete('q')
      for (const facet of FACET_ORDER) next.delete(facet)
    })
  }, [applyParams])

  const setSort = useCallback(
    (key: SortKey) => {
      applyParams((next) => {
        const current = parseSort(next)
        const direction =
          current.key === key
            ? current.direction === 'asc'
              ? 'desc'
              : 'asc'
            : DESCENDING_FIRST.includes(key)
              ? 'desc'
              : 'asc'
        next.set('sort', key)
        next.set('dir', direction)
      })
    },
    [applyParams],
  )

  const setGroupBy = useCallback(
    (key: GroupKey) => {
      applyParams((next) => {
        if (key === 'none') next.delete('group')
        else next.set('group', key)
      })
    },
    [applyParams],
  )

  const setPeekId = useCallback(
    (id: number | null) => {
      applyParams((next) => {
        if (id == null) next.delete('person')
        else next.set('person', String(id))
      })
    },
    [applyParams],
  )

  const setDensity = useCallback((next: Density) => {
    setDensityState(next)
    writeDensity(next)
  }, [])

  const toggleColumn = useCallback((id: ColumnId) => {
    setColumnsState((current) => {
      const next = normaliseColumns(
        current.includes(id)
          ? current.filter((column) => column !== id)
          : [...current, id],
      )
      writeColumns(next)
      return next
    })
  }, [])

  const resetColumns = useCallback(() => {
    setColumnsState(DEFAULT_COLUMNS)
    writeColumns(DEFAULT_COLUMNS)
  }, [])

  return {
    query,
    setQuery,
    selections,
    selectionCount: countSelections(selections),
    toggleFacet,
    setFacet,
    clearFilters,
    hasFilters: query.length > 0 || countSelections(selections) > 0,
    sort,
    setSort,
    groupBy,
    setGroupBy,
    peekId,
    setPeekId,
    scope,
    setScope,
    density,
    setDensity,
    columns,
    toggleColumn,
    resetColumns,
  }
}

export type DirectoryView = ReturnType<typeof useDirectoryView>
