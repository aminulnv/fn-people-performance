import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

const PANEL_GAP = 4
const VIEWPORT_PADDING = 8
const FALLBACK_PANEL_WIDTH = 288
const FALLBACK_PANEL_HEIGHT = 320

type FloatingPanelOptions = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLElement | null>
  /**
   * Size the panel to its content and never narrower than the trigger.
   * When the right edge would overflow, align to the trigger’s right instead.
   */
  fitContent?: boolean
}

/** Positions a portalled panel within the available browser viewport. */
export function useFloatingPanel({
  open,
  anchorRef,
  panelRef,
  fitContent = false,
}: FloatingPanelOptions): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>()

  useLayoutEffect(() => {
    if (!open) {
      setStyle(undefined)
      return
    }

    const positionPanel = () => {
      const anchor = anchorRef.current?.getBoundingClientRect()
      if (!anchor) return

      const panel = panelRef.current
      const panelWidth = Math.max(
        panel?.offsetWidth || FALLBACK_PANEL_WIDTH,
        fitContent ? anchor.width : 0,
      )
      const panelHeight = panel?.offsetHeight || FALLBACK_PANEL_HEIGHT
      const spaceBelow =
        window.innerHeight - VIEWPORT_PADDING - anchor.bottom - PANEL_GAP
      const spaceAbove = anchor.top - VIEWPORT_PADDING - PANEL_GAP
      const openAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow
      const availableHeight = Math.max(openAbove ? spaceAbove : spaceBelow, 0)
      const visibleHeight = Math.min(panelHeight, availableHeight)
      const top = openAbove
        ? Math.max(VIEWPORT_PADDING, anchor.top - PANEL_GAP - visibleHeight)
        : anchor.bottom + PANEL_GAP

      const maxLeft = Math.max(
        VIEWPORT_PADDING,
        window.innerWidth - VIEWPORT_PADDING - panelWidth,
      )
      let left = Math.min(Math.max(VIEWPORT_PADDING, anchor.left), maxLeft)
      if (fitContent && anchor.left + panelWidth > window.innerWidth - VIEWPORT_PADDING) {
        left = Math.min(Math.max(VIEWPORT_PADDING, anchor.right - panelWidth), maxLeft)
      }

      const next: CSSProperties = {
        position: 'fixed',
        top,
        left,
        right: 'auto',
        bottom: 'auto',
        width: fitContent ? 'max-content' : undefined,
        minWidth: fitContent ? anchor.width : undefined,
        maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
        maxHeight: availableHeight,
        zIndex: 1000,
      }

      setStyle((current) =>
        current &&
        current.top === next.top &&
        current.left === next.left &&
        current.maxHeight === next.maxHeight &&
        current.minWidth === next.minWidth &&
        current.width === next.width
          ? current
          : next,
      )
    }

    positionPanel()
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(positionPanel)
    if (anchorRef.current) observer?.observe(anchorRef.current)
    if (panelRef.current) observer?.observe(panelRef.current)

    return () => {
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
      observer?.disconnect()
    }
  }, [anchorRef, fitContent, open, panelRef])

  return style
}
