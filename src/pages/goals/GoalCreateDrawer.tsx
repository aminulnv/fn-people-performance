import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

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

type GoalCreateDrawerProps = {
  children: ReactNode
  label?: string
  closeLabel?: string
  onClose: () => void
}

export function GoalCreateDrawer({
  children,
  label = 'Add goal',
  closeLabel = 'Cancel adding goal',
  onClose,
}: GoalCreateDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null)
  const [drawerWidth, setDrawerWidth] = useState(() =>
    drawerWidthWithinViewport(DEFAULT_DRAWER_WIDTH),
  )
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
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

  return createPortal(
    <div className="pd-goals-drawer">
      <button
        type="button"
        className="pd-goals-drawer__scrim"
        aria-label={closeLabel}
        onClick={onClose}
      />
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
