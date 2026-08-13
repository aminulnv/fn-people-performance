import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '@/lib/cx'

type PopoverProps = {
  /** Visible trigger content. */
  label: ReactNode
  /** Accessible name when the label is icon-only. */
  ariaLabel?: string
  align?: 'start' | 'end'
  width?: string
  hideChevron?: boolean
  /** Keeps the trigger visually active while a non-default choice is applied. */
  active?: boolean
  children: (close: () => void) => ReactNode
}

/**
 * Minimal anchored panel: closes on outside pointer, Escape, or focus leaving.
 * Kept local to People V2 so the checkbox menus can own their own markup.
 */
export function Popover({
  label,
  ariaLabel,
  align = 'end',
  width,
  hideChevron,
  active,
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [close, open])

  return (
    <div className="pd-pv2-pop" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={cx(
          'pd-pv2-control',
          open && 'is-open',
          active && 'is-active',
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        {hideChevron ? null : (
          <ChevronDown size={13} strokeWidth={2} aria-hidden />
        )}
      </button>
      {open ? (
        <div
          className={cx('pd-pv2-pop__panel', `pd-pv2-pop__panel--${align}`)}
          style={width ? { width } : undefined}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  )
}
