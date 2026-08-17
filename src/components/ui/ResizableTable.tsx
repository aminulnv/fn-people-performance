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

export type ResizableColumn = {
  id: string
  label: ReactNode
  /** Spoken column name, for labels that are markup rather than plain text. */
  name?: string
  minWidth?: number
}

type ResizableTableProps = {
  storageKey: string
  columns: ResizableColumn[]
  className?: string
  children: ReactNode
}

type ColumnWidths = Record<string, number>

type ResizeStart = {
  columnId: string
  pointerX: number
  width: number
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

/** Widths saved before columns auto-sized meant something else, so start fresh. */
function storageKeyFor(storageKey: string): string {
  return `${storageKey}:v2`
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
 * Columns size themselves to their content until someone drags a divider. The
 * first drag freezes what the browser worked out, so the rest of the table stays
 * put while one column changes. Double clicking a divider fits that one column
 * back to its content.
 */
export function ResizableTable({
  storageKey,
  columns,
  className,
  children,
}: ResizableTableProps) {
  const [widths, setWidths] = useState<ColumnWidths>(() =>
    readStoredWidths(storageKeyFor(storageKey)),
  )
  const headerRowRef = useRef<HTMLTableRowElement>(null)
  const resizeStartRef = useRef<ResizeStart | null>(null)
  const refitRef = useRef<RefitRequest | null>(null)

  const isSizedByUser = columns.some((column) => widths[column.id] != null)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKeyFor(storageKey),
        JSON.stringify(widths),
      )
    } catch {
      // Storage is unavailable in private or restricted browser contexts.
    }
  }, [storageKey, widths])

  /** Widths the browser is showing right now, so a drag has a baseline. */
  function currentWidths(): ColumnWidths {
    const cells = headerRowRef.current?.cells
    if (!cells) return widths

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

  /**
   * A column can only be measured unconstrained, so a refit drops every width
   * for one render. Restore the untouched columns here, before the browser
   * paints the fully automatic table.
   */
  useLayoutEffect(() => {
    const refit = refitRef.current
    if (refit) {
      refitRef.current = null
      if (Object.keys(refit.keep).length === 0) return

      const natural = currentWidths()
      const fitted: ColumnWidths = { ...refit.keep }
      // Every refitted column has to end up with a width, or the check below
      // would ask for the same refit again on the next render.
      columns
        .filter((column) => refit.columnIds.includes(column.id))
        .forEach((column) => {
          fitted[column.id] = natural[column.id] ?? minWidthOf(column)
        })
      setWidths(fitted)
      return
    }

    // A column the caller just added would get no share of a fixed layout.
    const unsized = columns.filter((column) => widths[column.id] == null)
    if (!isSizedByUser || unsized.length === 0) return
    refitColumns(unsized.map((column) => column.id))
  })

  function refitColumns(columnIds: string[]) {
    const keep = { ...widths }
    columnIds.forEach((columnId) => delete keep[columnId])
    refitRef.current = { columnIds, keep }
    setWidths({})
  }

  function startResize(column: ResizableColumn): number {
    const baseline = isSizedByUser ? widths : currentWidths()
    if (!isSizedByUser) setWidths(baseline)
    return baseline[column.id] ?? minWidthOf(column)
  }

  function setColumnWidth(column: ResizableColumn, width: number) {
    setWidths((current) => ({
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

  const fixedWidth = columns.reduce(
    (total, column) => total + (widths[column.id] ?? 0),
    0,
  )

  return (
    <table
      className={[className, isSizedByUser ? 'pd-table-resize--sized' : '']
        .filter(Boolean)
        .join(' ')}
      style={isSizedByUser ? { width: fixedWidth, minWidth: '100%' } : undefined}
    >
      <colgroup>
        {columns.map((column) => (
          <col key={column.id} style={{ width: widths[column.id] }} />
        ))}
      </colgroup>
      <thead>
        <tr ref={headerRowRef}>
          {columns.map((column) => (
            <th key={column.id}>
              <span className="pd-table-resize__heading">{column.label}</span>
              <span
                className="pd-table-resize__handle"
                role="separator"
                aria-label={`Resize ${columnName(column)} column`}
                aria-orientation="vertical"
                aria-valuemin={minWidthOf(column)}
                aria-valuenow={widths[column.id]}
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
