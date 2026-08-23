import { describe, expect, it } from 'vitest'
import { logPopoverCoords } from './logPopoverPosition'

const viewport = { top: 0, right: 800, bottom: 700, left: 0 }

describe('logPopoverCoords', () => {
  it('opens below the trigger when there is room', () => {
    expect(
      logPopoverCoords(
        { top: 80, bottom: 100, left: 120 },
        { width: 232, height: 160 },
        viewport,
      ),
    ).toEqual({ top: 106, left: 120 })
  })

  it('opens above the trigger when the bottom does not fit', () => {
    expect(
      logPopoverCoords(
        { top: 620, bottom: 640, left: 120 },
        { width: 232, height: 180 },
        viewport,
      ),
    ).toEqual({ top: 434, left: 120 })
  })

  it('shrinks downward when neither side has enough room and the bottom has more space', () => {
    expect(
      logPopoverCoords(
        { top: 80, bottom: 100, left: 120 },
        { width: 232, height: 640 },
        viewport,
      ),
    ).toEqual({ top: 106, left: 120, maxHeight: 586 })
  })

  it('clamps upward when the top side is better but still too short', () => {
    expect(
      logPopoverCoords(
        { top: 350, bottom: 370, left: 120 },
        { width: 232, height: 600 },
        viewport,
      ),
    ).toEqual({ top: 8, left: 120, maxHeight: 336 })
  })

  it('shifts left when the popover would overflow the right edge', () => {
    expect(
      logPopoverCoords(
        { top: 80, bottom: 100, left: 720 },
        { width: 232, height: 120 },
        viewport,
      ),
    ).toEqual({ top: 106, left: 560 })
  })
})
