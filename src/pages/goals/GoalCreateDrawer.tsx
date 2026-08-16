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
import { X, type LucideIcon } from 'lucide-react'

const DEFAULT_DRAWER_WIDTH = 736
const MIN_DRAWER_WIDTH = 400
const DRAWER_VIEWPORT_GUTTER = 32
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
  onClose: () => void
}

export function GoalCreateDrawer({
  children,
  label = 'Add goal',
  closeLabel = 'Cancel adding goal',
  sideSheet,
  onClose,
}: GoalCreateDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const sheetCloseRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null)
  const [drawerWidth, setDrawerWidth] = useState(() =>
    drawerWidthWithinViewport(DEFAULT_DRAWER_WIDTH),
  )
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false)
  const isSideSheetOpenRef = useRef(isSideSheetOpen)
  const hasToggledSideSheetRef = useRef(false)
  onCloseRef.current = onClose
  isSideSheetOpenRef.current = isSideSheetOpen

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isSideSheetOpenRef.current) {
        setIsSideSheetOpen(false)
        return
      }
      onCloseRef.current()
    }
    document.addEventListener('keydown', closeOnEscape)
    const fitDrawerToViewport = () => {
      setDrawerWidth((width) => drawerWidthWithinViewport(width))
    }
    window.addEventListener('resize', fitDrawerToViewport)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', fitDrawerToViewport)
    }
  }, [])

  // The tab and the sheet replace each other, so focus has to follow the swap.
  useEffect(() => {
    if (!hasToggledSideSheetRef.current) return
    if (isSideSheetOpen) sheetCloseRef.current?.focus()
    else tabRef.current?.focus()
  }, [isSideSheetOpen])

  const toggleSideSheet = () => {
    hasToggledSideSheetRef.current = true
    setIsSideSheetOpen((open) => !open)
  }

  const resizeFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resizeStart = resizeStartRef.current
    if (!resizeStart) return
    setDrawerWidth(
      drawerWidthWithinViewport(
        resizeStart.width + resizeStart.pointerX - event.clientX,
      ),
    )
  }

  const resizeFromKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    setDrawerWidth((width) =>
      drawerWidthWithinViewport(width + direction * KEYBOARD_RESIZE_STEP),
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
          {isSideSheetOpen ? (
            <section
              className="pd-goals-drawer__sheet"
              aria-label={sideSheet.label}
            >
              <button
                ref={sheetCloseRef}
                type="button"
                className="pd-goals-drawer__sheet-close"
                aria-label={`Close ${sideSheet.label}`}
                onClick={toggleSideSheet}
              >
                <X size={15} strokeWidth={2.25} aria-hidden />
              </button>
              {sideSheet.content}
            </section>
          ) : (
            <button
              ref={tabRef}
              type="button"
              className="pd-goals-drawer__tab"
              aria-expanded={false}
              onClick={toggleSideSheet}
            >
              <TabIcon size={16} strokeWidth={2.25} aria-hidden />
              <span className="pd-goals-drawer__tab-label">
                {sideSheet.tabLabel}
              </span>
            </button>
          )}
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
          onDoubleClick={() =>
            setDrawerWidth(drawerWidthWithinViewport(DEFAULT_DRAWER_WIDTH))
          }
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
        <div className="pd-goals-drawer__body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
