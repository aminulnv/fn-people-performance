import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

const MIN_COLUMN_WIDTH = 72
const KEYBOARD_RESIZE_STEP = 16
/** Header plus a short sample — enough to size columns without walking every row. */
const MEASURE_ROW_CAP = 24
const RESIZE_WIDTH_EPSILON = 2

export type ResizableColumn = {
  id: string
  label: ReactNode
  /** Spoken column name, for labels that are markup rather than plain text. */
  name?: string
  minWidth?: number
  /** Shares leftover width once every column has what its content needs. */
  grow?: boolean
  /** Relative share of leftover width. Defaults to 1 when `grow` is set. */
  growWeight?: number
}

type ResizableTableProps = {
  storageKey: string
  columns: ResizableColumn[]
  className?: string
  children: ReactNode
  /**
   * Bump after the first real body rows mount (virtualized tables) so auto-fit
   * can sample visible cells. Do not change this on scroll or search.
   */
  fitKey?: string | number
}

type ColumnWidths = Record<string, number>

type ResizeStart = {
  columnId: string
  pointerX: number
  width: number
}

type AutoLayout = {
  widths: ColumnWidths
  tableWidth: number
  overflows: boolean
}

/** Columns waiting to be measured while every column is briefly automatic. */
type RefitRequest = {
  columnIds: string[]
  keep: ColumnWidths
}

function columnName(column: ResizableColumn): string {
  if (column.name) return column.name
  return typeof column.label === 'string' ? column.label : column.id
}

function minWidthOf(column: ResizableColumn): number {
  return column.minWidth ?? MIN_COLUMN_WIDTH
}

function growWeightOf(column: ResizableColumn): number {
  if (!column.grow) return 0
  const weight = column.growWeight ?? 1
  return weight > 0 ? weight : 1
}

function sumWidths(columns: ResizableColumn[], widths: ColumnWidths): number {
  return columns.reduce(
    (total, column) => total + (widths[column.id] ?? minWidthOf(column)),
    0,
  )
}

/** Widths saved before content-fit shipped used a different scheme, so start fresh. */
function storageKeyFor(storageKey: string): string {
  return `${storageKey}:v4`
}

function readStoredWidths(storageKey: string): ColumnWidths {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return {}
    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([columnId, width]) =>
          columnId.length > 0 &&
          typeof width === 'number' &&
          Number.isFinite(width) &&
          width >= MIN_COLUMN_WIDTH,
      ),
    )
  } catch {
    return {}
  }
}

/**
 * Map each visual column to its cells, honoring rowspan/colspan. Spacer rows
 * that span the whole table are skipped so they cannot inflate the first column.
 */
export function collectCellsByColumn(
  table: HTMLTableElement,
  columnCount: number,
): HTMLTableCellElement[][] {
  const grouped: HTMLTableCellElement[][] = Array.from(
    { length: columnCount },
    () => [],
  )
  const occupied: boolean[][] = []

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex]
    if (row.classList.contains('pd-people__virtual-pad')) continue

    occupied[rowIndex] ??= []
    let visualColumn = 0

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      while (occupied[rowIndex][visualColumn]) visualColumn += 1

      const cell = row.cells[cellIndex]
      const colspan = Math.max(1, cell.colSpan)
      const rowspan = Math.max(1, cell.rowSpan)

      if (colspan === 1 && visualColumn < columnCount) {
        grouped[visualColumn].push(cell)
      }

      for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
        occupied[rowIndex + rowOffset] ??= []
        for (let colOffset = 0; colOffset < colspan; colOffset += 1) {
          occupied[rowIndex + rowOffset][visualColumn + colOffset] = true
        }
      }
      visualColumn += colspan
    }
  }

  return grouped
}

function measureCellWidth(cell: HTMLTableCellElement): number {
  return Math.max(cell.scrollWidth, cell.offsetWidth)
}

function measureNaturalColumnWidths(
  table: HTMLTableElement,
  columns: ResizableColumn[],
): ColumnWidths {
  const widths: ColumnWidths = {}
  const grouped = collectCellsByColumn(table, columns.length)

  columns.forEach((column, columnIndex) => {
    let max = minWidthOf(column)
    const cells = grouped[columnIndex] ?? []
    const sampleCount = Math.min(cells.length, MEASURE_ROW_CAP)
    for (let index = 0; index < sampleCount; index += 1) {
      max = Math.max(max, measureCellWidth(cells[index]))
    }
    widths[column.id] = max
  })

  return widths
}

export function distributeAutoWidths(
  columns: ResizableColumn[],
  natural: ColumnWidths,
  availableWidth: number,
): AutoLayout {
  const fitted = { ...natural }
  const total = sumWidths(columns, fitted)
  const growColumns = columns.filter((column) => column.grow)

  if (growColumns.length === 0 || total >= availableWidth) {
    return {
      widths: fitted,
      tableWidth: total,
      overflows: total > availableWidth,
    }
  }

  const slack = availableWidth - total
  const weights = growColumns.map(growWeightOf)
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
  let assigned = 0

  growColumns.forEach((column, index) => {
    const extra =
      index === growColumns.length - 1
        ? slack - assigned
        : Math.floor((slack * weights[index]) / weightTotal)
    assigned += extra
    fitted[column.id] = (fitted[column.id] ?? minWidthOf(column)) + extra
  })

  return {
    widths: fitted,
    tableWidth: availableWidth,
    overflows: false,
  }
}

function columnSignature(columns: ResizableColumn[]): string {
  return columns
    .map(
      (column) =>
        `${column.id}:${column.minWidth ?? ''}:${column.grow ? '1' : '0'}:${column.growWeight ?? ''}`,
    )
    .join('|')
}

/**
 * Columns auto-fit to their content. Grow columns share leftover width so
 * short columns stay tight; manual drags still stick.
 */
export function ResizableTable({
  storageKey,
  columns,
  className,
  children,
  fitKey,
}: ResizableTableProps) {
  const storedWidths = readStoredWidths(storageKeyFor(storageKey))
  const [manualWidths, setManualWidths] = useState<ColumnWidths>(storedWidths)
  const [hasManualLayout, setHasManualLayout] = useState(
    () => Object.keys(storedWidths).length > 0,
  )
  const [autoLayout, setAutoLayout] = useState<AutoLayout | null>(null)
  const [fitPass, setFitPass] = useState(0)

  const tableRef = useRef<HTMLTableElement>(null)
  const headerRowRef = useRef<HTMLTableRowElement>(null)
  const resizeStartRef = useRef<ResizeStart | null>(null)
  const refitRef = useRef<RefitRequest | null>(null)
  const naturalWidthsRef = useRef<ColumnWidths>({})
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const columnsKey = columnSignature(columns)

  const activeWidths = hasManualLayout ? manualWidths : (autoLayout?.widths ?? {})
  const isAutoLaidOut = !hasManualLayout && autoLayout != null
  const isMeasuring = !hasManualLayout && autoLayout == null

  useEffect(() => {
    if (!hasManualLayout) return
    try {
      window.localStorage.setItem(
        storageKeyFor(storageKey),
        JSON.stringify(manualWidths),
      )
    } catch {
      // Storage is unavailable in private or restricted browser contexts.
    }
  }, [hasManualLayout, manualWidths, storageKey])

  /** Widths the browser is showing right now, so a drag has a baseline. */
  function currentWidths(): ColumnWidths {
    const cells = headerRowRef.current?.cells
    if (!cells) return activeWidths

    const measured: ColumnWidths = {}
    columns.forEach((column, index) => {
      const cell = cells[index]
      if (!cell) return
      measured[column.id] = Math.max(
        minWidthOf(column),
        Math.round(cell.getBoundingClientRect().width),
      )
    })
    return measured
  }

  function requestAutoFit() {
    if (hasManualLayout) return
    setAutoLayout(null)
    setFitPass((pass) => pass + 1)
  }

  useLayoutEffect(() => {
    if (hasManualLayout) return

    const table = tableRef.current
    const wrap = table?.parentElement
    const activeColumns = columnsRef.current
    if (!table || !wrap || table.rows.length === 0) return

    const natural = measureNaturalColumnWidths(table, activeColumns)
    naturalWidthsRef.current = natural
    const available = Math.max(wrap.clientWidth, 1)
    const next = distributeAutoWidths(activeColumns, natural, available)
    setAutoLayout((current) => {
      if (
        current &&
        current.tableWidth === next.tableWidth &&
        current.overflows === next.overflows &&
        activeColumns.every(
          (column) => current.widths[column.id] === next.widths[column.id],
        )
      ) {
        return current
      }
      return next
    })
  }, [columnsKey, fitKey, fitPass, hasManualLayout])

  useEffect(() => {
    if (hasManualLayout) return
    const wrap = tableRef.current?.parentElement
    if (!wrap || typeof ResizeObserver === 'undefined') return

    let lastWidth = wrap.clientWidth
    const observer = new ResizeObserver(() => {
      const nextWidth = wrap.clientWidth
      if (Math.abs(nextWidth - lastWidth) < RESIZE_WIDTH_EPSILON) return
      lastWidth = nextWidth

      const natural = naturalWidthsRef.current
      if (Object.keys(natural).length === 0) {
        requestAutoFit()
        return
      }
      setAutoLayout(
        distributeAutoWidths(
          columnsRef.current,
          natural,
          Math.max(nextWidth, 1),
        ),
      )
    })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [columnsKey, hasManualLayout])

  useLayoutEffect(() => {
    const refit = refitRef.current
    if (!refit) return
    refitRef.current = null
    if (Object.keys(refit.keep).length === 0) return

    const natural = currentWidths()
    const fitted: ColumnWidths = { ...refit.keep }
    columns
      .filter((column) => refit.columnIds.includes(column.id))
      .forEach((column) => {
        fitted[column.id] = natural[column.id] ?? minWidthOf(column)
      })
    setManualWidths(fitted)
  })

  useLayoutEffect(() => {
    if (!hasManualLayout) return

    const sizedCount = columns.filter(
      (column) => manualWidths[column.id] != null,
    ).length
    const isPartiallySized = sizedCount > 0 && sizedCount < columns.length
    if (!isPartiallySized) return

    refitColumns(
      columns
        .filter((column) => manualWidths[column.id] == null)
        .map((column) => column.id),
    )
  })

  function refitColumns(columnIds: string[]) {
    if (!hasManualLayout) {
      requestAutoFit()
      return
    }

    const keep = { ...manualWidths }
    columnIds.forEach((columnId) => delete keep[columnId])
    refitRef.current = { columnIds, keep }
    setManualWidths({})
  }

  function baselineWidths(): ColumnWidths {
    if (hasManualLayout) return manualWidths
    if (autoLayout) return autoLayout.widths
    return currentWidths()
  }

  function startResize(column: ResizableColumn): number {
    const baseline = baselineWidths()
    if (!hasManualLayout) {
      setHasManualLayout(true)
      setManualWidths(baseline)
      setAutoLayout(null)
    }
    return baseline[column.id] ?? minWidthOf(column)
  }

  function setColumnWidth(column: ResizableColumn, width: number) {
    setHasManualLayout(true)
    setManualWidths((current) => ({
      ...current,
      [column.id]: Math.round(Math.max(minWidthOf(column), width)),
    }))
  }

  function resizeFromPointer(
    column: ResizableColumn,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) {
    const resizeStart = resizeStartRef.current
    if (!resizeStart || resizeStart.columnId !== column.id) return
    setColumnWidth(
      column,
      resizeStart.width + event.clientX - resizeStart.pointerX,
    )
  }

  const manualFixedWidth = sumWidths(columns, manualWidths)

  const tableStyle = hasManualLayout
    ? { width: manualFixedWidth, minWidth: '100%' }
    : isAutoLaidOut && autoLayout
      ? {
          width: autoLayout.tableWidth,
          minWidth: autoLayout.overflows ? '100%' : autoLayout.tableWidth,
        }
      : undefined

  return (
    <table
      ref={tableRef}
      className={[
        className,
        hasManualLayout ? 'pd-table-resize--sized' : '',
        isAutoLaidOut ? 'pd-table-resize--laid-out' : '',
        isAutoLaidOut && autoLayout?.overflows ? 'pd-table-resize--overflow' : '',
        isMeasuring ? 'pd-table-resize--measure' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={tableStyle}
    >
      <colgroup>
        {columns.map((column) => (
          <col key={column.id} style={{ width: activeWidths[column.id] }} />
        ))}
      </colgroup>
      <thead>
        <tr ref={headerRowRef}>
          {columns.map((column) => (
            <th key={column.id} data-col={column.id}>
              <span className="pd-table-resize__heading">{column.label}</span>
              <span
                className="pd-table-resize__handle"
                role="separator"
                aria-label={`Resize ${columnName(column)} column`}
                aria-orientation="vertical"
                aria-valuemin={minWidthOf(column)}
                aria-valuenow={activeWidths[column.id]}
                title="Drag to resize, double click to fit content"
                tabIndex={0}
                onDoubleClick={() => refitColumns([column.id])}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                    return
                  }
                  event.preventDefault()
                  setColumnWidth(
                    column,
                    startResize(column) +
                      (event.key === 'ArrowRight'
                        ? KEYBOARD_RESIZE_STEP
                        : -KEYBOARD_RESIZE_STEP),
                  )
                }}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  resizeStartRef.current = {
                    columnId: column.id,
                    pointerX: event.clientX,
                    width: startResize(column),
                  }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => resizeFromPointer(column, event)}
                onPointerUp={(event) => {
                  resizeFromPointer(column, event)
                  resizeStartRef.current = null
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }}
                onPointerCancel={() => {
                  resizeStartRef.current = null
                }}
              />
            </th>
          ))}
        </tr>
      </thead>
      {children}
    </table>
  )
}
