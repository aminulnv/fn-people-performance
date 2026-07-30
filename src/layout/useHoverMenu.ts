import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_CLOSE_DELAY_MS = 150

type UseHoverMenuOptions = {
  isMobile?: boolean
  closeDelayMs?: number
  /** Close on Escape while open (desktop + mobile). */
  closeOnEscape?: boolean
}

/**
 * Shared open/close behavior for top-bar hover menus (profile, notifications).
 * Desktop: open on hover; click pins open until click-outside / Escape / second click.
 * Mobile: click-to-toggle; no hover handlers.
 */
export function useHoverMenu({
  isMobile,
  closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
  closeOnEscape = false,
}: UseHoverMenuOptions = {}) {
  const [open, setOpenState] = useState(false)
  const [pinned, setPinned] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const setOpen = useCallback(
    (value: boolean) => {
      clearCloseTimeout()
      if (!value) setPinned(false)
      setOpenState(value)
    },
    [clearCloseTimeout],
  )

  useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout])

  useEffect(() => {
    if (!open || isMobile) return

    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, isMobile, setOpen])

  useEffect(() => {
    if (!open || !closeOnEscape) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, closeOnEscape, setOpen])

  const hoverHandlers = isMobile
    ? undefined
    : {
        onMouseEnter: () => {
          clearCloseTimeout()
          setOpenState(true)
        },
        onMouseLeave: () => {
          if (pinned) return
          clearCloseTimeout()
          closeTimeoutRef.current = setTimeout(
            () => setOpenState(false),
            closeDelayMs,
          )
        },
      }

  const toggle = useCallback(() => {
    clearCloseTimeout()
    if (pinned) {
      setPinned(false)
      setOpenState(false)
      return
    }
    setPinned(true)
    setOpenState(true)
  }, [clearCloseTimeout, pinned])

  return { open, setOpen, containerRef, hoverHandlers, toggle }
}
