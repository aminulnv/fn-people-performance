import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: TooltipSide
  className?: string
  /** Hover/focus show delay in ms. Default 120; use 0 for instant. */
  delayMs?: number
  /** Render in a portal. Defaults to true for left/right so overflow does not clip. */
  portal?: boolean
}

const PORTAL_SIDES: TooltipSide[] = ['left', 'right']
const GAP_PX = 6

function coordsForSide(
  rect: DOMRect,
  side: TooltipSide,
): CSSProperties {
  const midY = rect.top + rect.height / 2
  const midX = rect.left + rect.width / 2

  switch (side) {
    case 'right':
      return {
        position: 'fixed',
        top: midY,
        left: rect.right + GAP_PX,
        transform: 'translateY(-50%)',
      }
    case 'left':
      return {
        position: 'fixed',
        top: midY,
        left: rect.left - GAP_PX,
        transform: 'translate(-100%, -50%)',
      }
    case 'bottom':
      return {
        position: 'fixed',
        top: rect.bottom + GAP_PX,
        left: midX,
        transform: 'translateX(-50%)',
      }
    case 'top':
    default:
      return {
        position: 'fixed',
        top: rect.top - GAP_PX,
        left: midX,
        transform: 'translate(-50%, -100%)',
      }
  }
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  delayMs = 120,
  portal,
}: TooltipProps) {
  const tipId = useId()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<CSSProperties>()
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const prefersPortal = portal ?? PORTAL_SIDES.includes(side)

  const clearShowTimer = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
  }

  const show = () => {
    clearShowTimer()
    if (delayMs <= 0) {
      setOpen(true)
      return
    }
    showTimer.current = setTimeout(() => setOpen(true), delayMs)
  }

  const hide = () => {
    clearShowTimer()
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(undefined)
      setPortalRoot(null)
      return
    }

    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const dialog = el.closest('dialog')
      const root = dialog ?? (prefersPortal ? document.body : null)
      setPortalRoot(root)
      if (root) setCoords(coordsForSide(el.getBoundingClientRect(), side))
      else setCoords(undefined)
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, prefersPortal, side])

  const positionsFixed = Boolean(portalRoot)
  const tip = open ? (
    <span
      id={tipId}
      role="tooltip"
      className={cx(
        'pd-tooltip__content',
        `pd-tooltip__content--${side}`,
        positionsFixed && 'pd-tooltip__content--portal',
      )}
      style={positionsFixed ? coords : undefined}
    >
      {content}
    </span>
  ) : null

  return (
    <span
      className={cx('pd-tooltip', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        ref={triggerRef}
        className="pd-tooltip__trigger"
        aria-describedby={open ? tipId : undefined}
      >
        {children}
      </span>
      {portalRoot
        ? tip && coords
          ? createPortal(tip, portalRoot)
          : null
        : tip}
    </span>
  )
}
