import type { CSSProperties } from 'react'

export const LOG_POP_GAP_PX = 6
export const LOG_POP_PAD_PX = 8
export const LOG_POP_FALLBACK_WIDTH = 232
export const LOG_POP_FALLBACK_HEIGHT = 180
export const LOG_POP_MIN_HEIGHT = 120

export type PopoverBox = {
  top: number
  right: number
  bottom: number
  left: number
}

export type PopoverSize = {
  width: number
  height: number
}

export function visibleLogPopoverBounds(): PopoverBox {
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

export function logPopoverCoords(
  trigger: Pick<DOMRect, 'top' | 'bottom' | 'left'>,
  pop: PopoverSize | undefined,
  viewport: PopoverBox,
): CSSProperties {
  const width = pop?.width || LOG_POP_FALLBACK_WIDTH
  const height = pop?.height || LOG_POP_FALLBACK_HEIGHT
  const left = Math.max(
    viewport.left + LOG_POP_PAD_PX,
    Math.min(trigger.left, viewport.right - width - LOG_POP_PAD_PX),
  )
  const spaceBelow = viewport.bottom - trigger.bottom - LOG_POP_GAP_PX
  const spaceAbove = trigger.top - viewport.top - LOG_POP_GAP_PX
  const openUp = spaceBelow < height && spaceAbove > spaceBelow

  if (!openUp) {
    const maxHeight =
      spaceBelow < height
        ? Math.max(LOG_POP_MIN_HEIGHT, spaceBelow - LOG_POP_PAD_PX)
        : undefined
    return {
      top: trigger.bottom + LOG_POP_GAP_PX,
      left,
      ...(maxHeight ? { maxHeight } : {}),
    }
  }

  const top = trigger.top - LOG_POP_GAP_PX - height
  if (top >= viewport.top + LOG_POP_PAD_PX) {
    return { top, left }
  }

  return {
    top: viewport.top + LOG_POP_PAD_PX,
    left,
    maxHeight: Math.max(
      LOG_POP_MIN_HEIGHT,
      trigger.top - LOG_POP_GAP_PX - viewport.top - LOG_POP_PAD_PX,
    ),
  }
}
