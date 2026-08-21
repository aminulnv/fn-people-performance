import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const DEFAULT_PANEL_WIDTH = 736
const MIN_PANEL_WIDTH = 400
const VIEWPORT_GUTTER = 32
const KEYBOARD_RESIZE_STEP = 32

function panelWidthWithinViewport(width: number): number {
  const viewportWidth =
    typeof window === 'undefined' ? DEFAULT_PANEL_WIDTH : window.innerWidth
  const maximumWidth = Math.max(
    MIN_PANEL_WIDTH,
    viewportWidth - VIEWPORT_GUTTER,
  )
  return Math.min(Math.max(width, MIN_PANEL_WIDTH), maximumWidth)
}

type SettingsSidePanelProps = {
  children: ReactNode
  label: string
  closeLabel: string
  /** Replaces the default heading when the caller needs an editable title. */
  title?: ReactNode
  onClose: () => void
}

export function SettingsSidePanel({
  children,
  label,
  closeLabel,
  title,
  onClose,
}: SettingsSidePanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(
    null,
  )
  const [panelWidth, setPanelWidth] = useState(() =>
    panelWidthWithinViewport(DEFAULT_PANEL_WIDTH),
  )
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('dialog[open], .pd-reviews-drawer')) return
      onCloseRef.current()
    }
    document.addEventListener('keydown', closeOnEscape)
    const fitPanelToViewport = () => {
      setPanelWidth((width) => panelWidthWithinViewport(width))
    }
    window.addEventListener('resize', fitPanelToViewport)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', fitPanelToViewport)
    }
  }, [])

  const applyPanelWidth = (width: number) => {
    setPanelWidth(panelWidthWithinViewport(width))
  }

  const resizeFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resizeStart = resizeStartRef.current
    if (!resizeStart) return
    applyPanelWidth(resizeStart.width + resizeStart.pointerX - event.clientX)
  }

  const resizeFromKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    applyPanelWidth(panelWidth + direction * KEYBOARD_RESIZE_STEP)
  }

  return createPortal(
    <div className="pd-settings-panel">
      <button
        type="button"
        className="pd-settings-panel__scrim"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="pd-settings-panel__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ width: panelWidth }}
      >
        <div
          className="pd-settings-panel__resize"
          role="separator"
          aria-label="Resize settings panel"
          aria-orientation="vertical"
          aria-valuemin={MIN_PANEL_WIDTH}
          aria-valuemax={Math.max(
            MIN_PANEL_WIDTH,
            window.innerWidth - VIEWPORT_GUTTER,
          )}
          aria-valuenow={Math.round(panelWidth)}
          tabIndex={0}
          onDoubleClick={() => applyPanelWidth(DEFAULT_PANEL_WIDTH)}
          onKeyDown={resizeFromKeyboard}
          onPointerDown={(event) => {
            resizeStartRef.current = {
              pointerX: event.clientX,
              width: panelWidth,
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
        <header className="pd-settings-panel__chrome">
          <div className="pd-settings-panel__heading">
            {title ?? <h2 className="pd-settings-panel__title">{label}</h2>}
          </div>
          <div className="pd-settings-panel__tools">
            <button
              type="button"
              className="pd-people__icon-btn"
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              <X size={18} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </header>
        <div className="pd-settings-panel__body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
