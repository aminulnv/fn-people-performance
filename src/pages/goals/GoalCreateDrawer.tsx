import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { type LucideIcon } from 'lucide-react'

const DEFAULT_DRAWER_WIDTH = 736
const MIN_DRAWER_WIDTH = 400
const DRAWER_VIEWPORT_GUTTER = 32
const DEFAULT_SHEET_WIDTH = 368
const MIN_SHEET_WIDTH = 280
const SHEET_VIEWPORT_GUTTER = 16
const KEYBOARD_RESIZE_STEP = 32

function drawerWidthWithinViewport(width: number): number {
  const viewportWidth =
    typeof window === 'undefined' ? DEFAULT_DRAWER_WIDTH : window.innerWidth
  const maximumWidth = Math.max(
    MIN_DRAWER_WIDTH,
    viewportWidth - DRAWER_VIEWPORT_GUTTER,
  )
  return Math.min(Math.max(width, MIN_DRAWER_WIDTH), maximumWidth)
}

function sheetWidthWithinRail(width: number, drawerWidth: number): number {
  const viewportWidth =
    typeof window === 'undefined'
      ? DEFAULT_SHEET_WIDTH + drawerWidth
      : window.innerWidth
  const maximumWidth = Math.max(
    MIN_SHEET_WIDTH,
    viewportWidth - drawerWidth - SHEET_VIEWPORT_GUTTER,
  )
  return Math.min(Math.max(width, MIN_SHEET_WIDTH), maximumWidth)
}

/**
 * Reference content reachable from a bookmark tab on the drawer's left edge, so
 * it can be pulled out from behind the goal panel instead of competing with it.
 */
type GoalDrawerSideSheet = {
  tabLabel: string
  tabIcon: LucideIcon
  label: string
  content: ReactNode
}

type GoalCreateDrawerProps = {
  children: ReactNode
  label?: string
  closeLabel?: string
  sideSheet?: GoalDrawerSideSheet
  /** Full-width strip above the padded body — e.g. Action required. */
  ribbon?: ReactNode
  onClose: () => void
}

export function GoalCreateDrawer({
  children,
  label = 'Add goal',
  closeLabel = 'Cancel adding goal',
  sideSheet,
  ribbon,
  onClose,
}: GoalCreateDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null)
  const sheetResizeStartRef = useRef<{ pointerX: number; width: number } | null>(
    null,
  )
  const [drawerWidth, setDrawerWidth] = useState(() =>
    drawerWidthWithinViewport(DEFAULT_DRAWER_WIDTH),
  )
  const [sheetWidth, setSheetWidth] = useState(() =>
    sheetWidthWithinRail(DEFAULT_SHEET_WIDTH, DEFAULT_DRAWER_WIDTH),
  )
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false)
  const [isTabHovered, setIsTabHovered] = useState(false)
  const isSideSheetOpenRef = useRef(isSideSheetOpen)
  const hasToggledSideSheetRef = useRef(false)
  const holdTabHoverRef = useRef(false)
  onCloseRef.current = onClose
  isSideSheetOpenRef.current = isSideSheetOpen
  const isTabExpanded = isSideSheetOpen !== isTabHovered

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('dialog[open]')) return
      if (isSideSheetOpenRef.current) {
        setIsSideSheetOpen(false)
        return
      }
      onCloseRef.current()
    }
    document.addEventListener('keydown', closeOnEscape)
    const fitPanelsToViewport = () => {
      setDrawerWidth((width) => {
        const nextDrawerWidth = drawerWidthWithinViewport(width)
        setSheetWidth((sheet) => sheetWidthWithinRail(sheet, nextDrawerWidth))
        return nextDrawerWidth
      })
    }
    window.addEventListener('resize', fitPanelsToViewport)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', fitPanelsToViewport)
    }
  }, [])

  useEffect(() => {
    if (!hasToggledSideSheetRef.current) return
    tabRef.current?.focus()
  }, [isSideSheetOpen])

  const toggleSideSheet = () => {
    hasToggledSideSheetRef.current = true
    // Keep the size that the click promised until the pointer leaves. Otherwise
    // the lingering hover immediately applies the opposite preview.
    holdTabHoverRef.current = true
    setIsTabHovered(false)
    setIsSideSheetOpen((open) => !open)
  }

  const revealTabHover = () => {
    if (holdTabHoverRef.current) return
    setIsTabHovered(true)
  }

  const clearTabHover = () => {
    holdTabHoverRef.current = false
    setIsTabHovered(false)
  }

  const applyDrawerWidth = (width: number) => {
    const nextDrawerWidth = drawerWidthWithinViewport(width)
    setDrawerWidth(nextDrawerWidth)
    setSheetWidth((sheet) => sheetWidthWithinRail(sheet, nextDrawerWidth))
  }

  const resizeFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resizeStart = resizeStartRef.current
    if (!resizeStart) return
    applyDrawerWidth(
      resizeStart.width + resizeStart.pointerX - event.clientX,
    )
  }

  const resizeFromKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    applyDrawerWidth(drawerWidth + direction * KEYBOARD_RESIZE_STEP)
  }

  const resizeSheetFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resizeStart = sheetResizeStartRef.current
    if (!resizeStart) return
    setSheetWidth(
      sheetWidthWithinRail(
        resizeStart.width + resizeStart.pointerX - event.clientX,
        drawerWidth,
      ),
    )
  }

  const resizeSheetFromKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    setSheetWidth((width) =>
      sheetWidthWithinRail(
        width + direction * KEYBOARD_RESIZE_STEP,
        drawerWidth,
      ),
    )
  }

  const TabIcon = sideSheet?.tabIcon

  return createPortal(
    <div
      className="pd-goals-drawer"
      style={
        { '--pd-goal-drawer-width': `${drawerWidth}px` } as CSSProperties
      }
    >
      <button
        type="button"
        className="pd-goals-drawer__scrim"
        aria-label={closeLabel}
        onClick={onClose}
      />
      {sideSheet && TabIcon ? (
        <div className="pd-goals-drawer__rail">
          <div
            className={
              isSideSheetOpen
                ? 'pd-goals-drawer__sheet-stack pd-goals-drawer__sheet-stack--open'
                : 'pd-goals-drawer__sheet-stack'
            }
          >
            <button
              ref={tabRef}
              type="button"
              className="pd-goals-drawer__tab"
              data-expanded={isTabExpanded ? 'true' : 'false'}
              aria-expanded={isSideSheetOpen}
              aria-controls={
                isSideSheetOpen ? 'pd-goals-drawer-side-sheet' : undefined
              }
              onClick={toggleSideSheet}
              onPointerEnter={revealTabHover}
              onPointerLeave={clearTabHover}
            >
              <span className="pd-goals-drawer__tab-label">
                {sideSheet.tabLabel}
              </span>
              <TabIcon size={16} strokeWidth={2.25} aria-hidden />
            </button>
            {isSideSheetOpen ? (
              <section
                id="pd-goals-drawer-side-sheet"
                className="pd-goals-drawer__sheet"
                aria-label={sideSheet.label}
                style={{ width: sheetWidth }}
              >
                <div
                  className="pd-goals-drawer__resize-handle"
                  role="separator"
                  aria-label="Resize OKR reference panel"
                  aria-orientation="vertical"
                  aria-valuemin={MIN_SHEET_WIDTH}
                  aria-valuemax={Math.max(
                    MIN_SHEET_WIDTH,
                    window.innerWidth - drawerWidth - SHEET_VIEWPORT_GUTTER,
                  )}
                  aria-valuenow={Math.round(sheetWidth)}
                  tabIndex={0}
                  onDoubleClick={() =>
                    setSheetWidth(
                      sheetWidthWithinRail(DEFAULT_SHEET_WIDTH, drawerWidth),
                    )
                  }
                  onKeyDown={resizeSheetFromKeyboard}
                  onPointerDown={(event) => {
                    sheetResizeStartRef.current = {
                      pointerX: event.clientX,
                      width: sheetWidth,
                    }
                    event.currentTarget.setPointerCapture(event.pointerId)
                  }}
                  onPointerMove={resizeSheetFromPointer}
                  onPointerUp={(event) => {
                    sheetResizeStartRef.current = null
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }}
                  onPointerCancel={() => {
                    sheetResizeStartRef.current = null
                  }}
                />
                {sideSheet.content}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
      <aside
        ref={panelRef}
        className="pd-goals-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ width: drawerWidth }}
      >
        <div
          className="pd-goals-drawer__resize-handle"
          role="separator"
          aria-label="Resize goal panel"
          aria-orientation="vertical"
          aria-valuemin={MIN_DRAWER_WIDTH}
          aria-valuemax={Math.max(
            MIN_DRAWER_WIDTH,
            window.innerWidth - DRAWER_VIEWPORT_GUTTER,
          )}
          aria-valuenow={Math.round(drawerWidth)}
          tabIndex={0}
          onDoubleClick={() => applyDrawerWidth(DEFAULT_DRAWER_WIDTH)}
          onKeyDown={resizeFromKeyboard}
          onPointerDown={(event) => {
            resizeStartRef.current = {
              pointerX: event.clientX,
              width: drawerWidth,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={resizeFromPointer}
          onPointerUp={(event) => {
            resizeStartRef.current = null
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={() => {
            resizeStartRef.current = null
          }}
        />
        {ribbon ? (
          <div className="pd-goals-drawer__ribbon">{ribbon}</div>
        ) : null}
        <div className="pd-goals-drawer__body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
