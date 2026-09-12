export type MenuAlign = 'start' | 'end'

export type MenuPlacement = {
  vertical: 'above' | 'below'
  horizontal: MenuAlign
}

export type ViewportBox = {
  top: number
  right: number
  bottom: number
  left: number
}

export const MENU_GAP_PX = 6
export const MENU_PAD_PX = 8

export type FloatingPanelBox = {
  top: number
  left: number
  maxHeight: number
  placement: MenuPlacement
}

export function visibleMenuBounds(): ViewportBox {
  if (typeof document !== 'undefined') {
    const scroll = document.querySelector('.pd-app-scroll')
    if (scroll) {
      const rect = scroll.getBoundingClientRect()
      if (rect.height > 0 && rect.width > 0) {
        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        }
      }
    }
  }

  const width = typeof window === 'undefined' ? 1024 : window.innerWidth
  const height = typeof window === 'undefined' ? 768 : window.innerHeight
  return { top: 0, right: width, bottom: height, left: 0 }
}

export function resolveDropdownMenuPlacement(
  trigger: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  panel: { width: number; height: number },
  viewport: ViewportBox,
  preferredAlign: MenuAlign = 'start',
): MenuPlacement {
  const spaceBelow = viewport.bottom - trigger.bottom - MENU_GAP_PX
  const spaceAbove = trigger.top - viewport.top - MENU_GAP_PX
  const vertical: MenuPlacement['vertical'] =
    spaceBelow < panel.height && spaceAbove > spaceBelow ? 'above' : 'below'

  const fitsStart =
    trigger.left + panel.width <= viewport.right - MENU_PAD_PX
  const fitsEnd =
    trigger.right - panel.width >= viewport.left + MENU_PAD_PX

  let horizontal: MenuAlign = preferredAlign
  if (preferredAlign === 'end') {
    if (!fitsEnd && fitsStart) horizontal = 'start'
  } else if (!fitsStart && fitsEnd) {
    horizontal = 'end'
  }

  return { vertical, horizontal }
}

/** Fixed coordinates so a panel never expands the page or clips a scroll parent. */
export function resolveFloatingPanelBox(
  trigger: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  panel: { width: number; height: number },
  viewport: ViewportBox,
  preferredAlign: MenuAlign = 'start',
): FloatingPanelBox {
  const placement = resolveDropdownMenuPlacement(
    trigger,
    panel,
    viewport,
    preferredAlign,
  )
  const spaceBelow = viewport.bottom - trigger.bottom - MENU_GAP_PX
  const spaceAbove = trigger.top - viewport.top - MENU_GAP_PX
  const availableHeight = Math.max(
    placement.vertical === 'above' ? spaceAbove : spaceBelow,
    0,
  )
  const visibleHeight = Math.min(panel.height, availableHeight)
  const top =
    placement.vertical === 'above'
      ? Math.max(
          viewport.top + MENU_PAD_PX,
          trigger.top - MENU_GAP_PX - visibleHeight,
        )
      : trigger.bottom + MENU_GAP_PX
  const preferredLeft =
    placement.horizontal === 'end'
      ? trigger.right - panel.width
      : trigger.left
  const minLeft = viewport.left + MENU_PAD_PX
  const maxLeft = viewport.right - MENU_PAD_PX - panel.width
  const left =
    maxLeft < minLeft
      ? minLeft
      : Math.min(Math.max(minLeft, preferredLeft), maxLeft)

  return { top, left, maxHeight: availableHeight, placement }
}
