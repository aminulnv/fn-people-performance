import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import {
  resolveFloatingPanelBox,
  visibleMenuBounds,
  type MenuAlign,
} from './dropdownMenuPlacement'

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
  preferredAlign?: MenuAlign
}

/** Positions a portalled panel within the available browser viewport. */
export function useFloatingPanel({
  open,
  anchorRef,
  panelRef,
  fitContent = false,
  preferredAlign = 'start',
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
      const box = resolveFloatingPanelBox(
        anchor,
        { width: panelWidth, height: panelHeight },
        visibleMenuBounds(),
        preferredAlign,
      )

      const next: CSSProperties = {
        position: 'fixed',
        top: box.top,
        left: box.left,
        right: 'auto',
        bottom: 'auto',
        width: fitContent ? 'max-content' : undefined,
        minWidth: fitContent ? anchor.width : undefined,
        maxWidth: `calc(100vw - ${16}px)`,
        maxHeight: box.maxHeight,
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
  }, [anchorRef, fitContent, open, panelRef, preferredAlign])

  return style
}
