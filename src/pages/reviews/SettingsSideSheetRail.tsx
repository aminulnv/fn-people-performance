import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { type LucideIcon } from 'lucide-react'

const DEFAULT_SHEET_WIDTH = 480
const MIN_SHEET_WIDTH = 320
const SHEET_VIEWPORT_GUTTER = 16
const INLINE_SETTINGS_RESERVE = 280
const KEYBOARD_RESIZE_STEP = 32

export type SettingsSideSheet = {
  tabLabel: string
  tabIcon: LucideIcon
  label: string
  content: ReactNode
}

function sheetWidthWithinRail(
  width: number,
  reservedWidth: number,
): number {
  const viewportWidth =
    typeof window === 'undefined'
      ? DEFAULT_SHEET_WIDTH + reservedWidth
      : window.innerWidth
  const maximumWidth = Math.max(
    MIN_SHEET_WIDTH,
    viewportWidth - reservedWidth - SHEET_VIEWPORT_GUTTER,
  )
  return Math.min(Math.max(width, MIN_SHEET_WIDTH), maximumWidth)
}

type SettingsSideSheetRailProps = {
  sideSheet: SettingsSideSheet
  layout: 'overlay' | 'inline'
  panelWidth: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Bookmark tab that pulls a second sheet out from behind the settings panel,
 * the same way the goals drawer reveals department OKRs.
 */
export function SettingsSideSheetRail({
  sideSheet,
  layout,
  panelWidth,
  isOpen,
  onOpenChange,
}: SettingsSideSheetRailProps) {
  const tabRef = useRef<HTMLButtonElement>(null)
  const sheetResizeStartRef = useRef<{ pointerX: number; width: number } | null>(
    null,
  )
  const reservedWidth = layout === 'inline' ? INLINE_SETTINGS_RESERVE : panelWidth
  const [sheetWidth, setSheetWidth] = useState(() =>
    sheetWidthWithinRail(DEFAULT_SHEET_WIDTH, reservedWidth),
  )
  const hasToggledRef = useRef(false)
  const holdTabHoverRef = useRef(false)
  const [isTabHovered, setIsTabHovered] = useState(false)
  const isTabExpanded = isOpen !== isTabHovered

  useEffect(() => {
    setSheetWidth((width) => sheetWidthWithinRail(width, reservedWidth))
  }, [reservedWidth])

  useEffect(() => {
    if (!hasToggledRef.current) return
    tabRef.current?.focus()
  }, [isOpen])

  const toggle = () => {
    hasToggledRef.current = true
    holdTabHoverRef.current = true
    setIsTabHovered(false)
    onOpenChange(!isOpen)
  }

  const revealTabHover = () => {
    if (holdTabHoverRef.current) return
    setIsTabHovered(true)
  }

  const clearTabHover = () => {
    holdTabHoverRef.current = false
    setIsTabHovered(false)
  }

  const applySheetWidth = (width: number) => {
    setSheetWidth(sheetWidthWithinRail(width, reservedWidth))
  }

  const resizeFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resizeStart = sheetResizeStartRef.current
    if (!resizeStart) return
    applySheetWidth(resizeStart.width + resizeStart.pointerX - event.clientX)
  }

  const resizeFromKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    applySheetWidth(sheetWidth + direction * KEYBOARD_RESIZE_STEP)
  }

  const TabIcon = sideSheet.tabIcon
  const railClass =
    layout === 'inline'
      ? 'pd-settings-panel__rail pd-settings-panel__rail--inline'
      : 'pd-settings-panel__rail'

  return (
    <div className={railClass}>
      <div
        className={
          isOpen
            ? 'pd-settings-panel__sheet-stack pd-settings-panel__sheet-stack--open'
            : 'pd-settings-panel__sheet-stack'
        }
      >
        <button
          ref={tabRef}
          type="button"
          className="pd-settings-panel__tab"
          data-expanded={isTabExpanded ? 'true' : 'false'}
          aria-expanded={isOpen}
          aria-controls={isOpen ? 'pd-settings-side-sheet' : undefined}
          onClick={toggle}
          onPointerEnter={revealTabHover}
          onPointerLeave={clearTabHover}
        >
          <span className="pd-settings-panel__tab-label">
            {sideSheet.tabLabel}
          </span>
          <TabIcon size={16} strokeWidth={2.25} aria-hidden />
        </button>
        {isOpen ? (
          <section
            id="pd-settings-side-sheet"
            className="pd-settings-panel__side-sheet"
            aria-label={sideSheet.label}
            style={{ width: sheetWidth }}
          >
            <div
              className="pd-settings-panel__side-resize"
              role="separator"
              aria-label="Resize review form panel"
              aria-orientation="vertical"
              aria-valuemin={MIN_SHEET_WIDTH}
              aria-valuemax={Math.max(
                MIN_SHEET_WIDTH,
                window.innerWidth - reservedWidth - SHEET_VIEWPORT_GUTTER,
              )}
              aria-valuenow={Math.round(sheetWidth)}
              tabIndex={0}
              onDoubleClick={() => applySheetWidth(DEFAULT_SHEET_WIDTH)}
              onKeyDown={resizeFromKeyboard}
              onPointerDown={(event) => {
                sheetResizeStartRef.current = {
                  pointerX: event.clientX,
                  width: sheetWidth,
                }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={resizeFromPointer}
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
  )
}

type SettingsSideSheetPageHostProps = {
  sideSheet: SettingsSideSheet
  children: ReactNode
}

/** Full-page host: form sheet sits to the left of the settings column. */
export function SettingsSideSheetPageHost({
  sideSheet,
  children,
}: SettingsSideSheetPageHostProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('dialog[open], .pd-reviews-drawer, .pd-settings-panel')) {
        return
      }
      if (!isOpenRef.current) return
      setIsOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <div className="pd-settings-side-sheet-page">
      <SettingsSideSheetRail
        sideSheet={sideSheet}
        layout="inline"
        panelWidth={0}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
      <div className="pd-settings-side-sheet-page__main">{children}</div>
    </div>
  )
}
