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
  /** Keep the tip open while the pointer is over it (for links). */
  interactive?: boolean
}

const PORTAL_SIDES: TooltipSide[] = ['left', 'right']
const GAP_PX = 6
const VIEWPORT_PAD_PX = 8
const INTERACTIVE_HIDE_MS = 140

function clampPortalCoords(
  trigger: DOMRect,
  tip: { width: number; height: number },
  side: TooltipSide,
): CSSProperties {
  const maxTop = Math.max(
    VIEWPORT_PAD_PX,
    window.innerHeight - tip.height - VIEWPORT_PAD_PX,
  )
  const maxLeft = Math.max(
    VIEWPORT_PAD_PX,
    window.innerWidth - tip.width - VIEWPORT_PAD_PX,
  )
  let top = trigger.top + trigger.height / 2 - tip.height / 2
  let left = trigger.left + trigger.width / 2 - tip.width / 2

  if (side === 'left' || side === 'right') {
    top = trigger.top + trigger.height / 2 - tip.height / 2
    const preferLeft = side === 'left'
    left = preferLeft
      ? trigger.left - GAP_PX - tip.width
      : trigger.right + GAP_PX
    if (preferLeft && left < VIEWPORT_PAD_PX) {
      left = trigger.right + GAP_PX
    } else if (!preferLeft && left + tip.width > window.innerWidth - VIEWPORT_PAD_PX) {
      left = trigger.left - GAP_PX - tip.width
    }
  } else if (side === 'bottom') {
    top = trigger.bottom + GAP_PX
    left = trigger.left + trigger.width / 2 - tip.width / 2
  } else {
    top = trigger.top - GAP_PX - tip.height
    left = trigger.left + trigger.width / 2 - tip.width / 2
  }

  return {
    position: 'fixed',
    top: Math.min(Math.max(top, VIEWPORT_PAD_PX), maxTop),
    left: Math.min(Math.max(left, VIEWPORT_PAD_PX), maxLeft),
    transform: 'none',
  }
}

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
  interactive = false,
}: TooltipProps) {
  const tipId = useId()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<CSSProperties>()
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const prefersPortal = portal ?? PORTAL_SIDES.includes(side)

  const clearShowTimer = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
  }

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const show = () => {
    clearShowTimer()
    clearHideTimer()
    if (delayMs <= 0) {
      setOpen(true)
      return
    }
    showTimer.current = setTimeout(() => setOpen(true), delayMs)
  }

  const hide = () => {
    clearShowTimer()
    if (interactive) {
      hideTimer.current = setTimeout(() => setOpen(false), INTERACTIVE_HIDE_MS)
      return
    }
    setOpen(false)
  }

  useLayoutEffect(() => () => {
    clearShowTimer()
    clearHideTimer()
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setCoords(undefined)
      setPortalRoot(null)
      return
    }

    const place = () => {
      const el = triggerRef.current
      if (!el) return
      const dialog = el.closest('dialog')
      const root = dialog ?? (prefersPortal ? document.body : null)
      setPortalRoot(root)
      if (!root) {
        setCoords(undefined)
        return
      }
      const trigger = el.getBoundingClientRect()
      const tip = contentRef.current
      if (tip && tip.offsetWidth > 0) {
        setCoords(
          clampPortalCoords(
            trigger,
            { width: tip.offsetWidth, height: tip.offsetHeight },
            side,
          ),
        )
        return
      }
      setCoords(coordsForSide(trigger, side))
    }

    place()
    const tip = contentRef.current
    const observer =
      tip && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(place)
        : null
    if (tip) observer?.observe(tip)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, portalRoot, prefersPortal, side])

  const positionsFixed = Boolean(portalRoot)
  const tip = open ? (
    <span
      ref={contentRef}
      id={tipId}
      role="tooltip"
      className={cx(
        'pd-tooltip__content',
        `pd-tooltip__content--${side}`,
        positionsFixed && 'pd-tooltip__content--portal',
        interactive && 'pd-tooltip__content--interactive',
      )}
      style={positionsFixed ? coords : undefined}
      onMouseEnter={interactive ? show : undefined}
      onMouseLeave={interactive ? hide : undefined}
      onFocus={interactive ? show : undefined}
      onBlur={interactive ? hide : undefined}
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
