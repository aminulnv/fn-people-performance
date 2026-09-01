import { describe, expect, it } from 'vitest'
import { resolveDropdownMenuPlacement } from './dropdownMenuPlacement'

const viewport = { top: 0, right: 800, bottom: 700, left: 0 }

describe('resolveDropdownMenuPlacement', () => {
  it('opens below the trigger when there is room', () => {
    expect(
      resolveDropdownMenuPlacement(
        { top: 80, bottom: 100, left: 200, right: 228 },
        { width: 176, height: 120 },
        viewport,
        'end',
      ),
    ).toEqual({ vertical: 'below', horizontal: 'end' })
  })

  it('opens above the trigger when the bottom does not fit', () => {
    expect(
      resolveDropdownMenuPlacement(
        { top: 620, bottom: 640, left: 200, right: 228 },
        { width: 176, height: 180 },
        viewport,
        'end',
      ),
    ).toEqual({ vertical: 'above', horizontal: 'end' })
  })

  it('flips to start when end alignment would overflow the left edge', () => {
    expect(
      resolveDropdownMenuPlacement(
        { top: 80, bottom: 100, left: 20, right: 48 },
        { width: 176, height: 120 },
        viewport,
        'end',
      ),
    ).toEqual({ vertical: 'below', horizontal: 'start' })
  })

  it('flips to end when start alignment would overflow the right edge', () => {
    expect(
      resolveDropdownMenuPlacement(
        { top: 80, bottom: 100, left: 720, right: 748 },
        { width: 176, height: 120 },
        viewport,
        'start',
      ),
    ).toEqual({ vertical: 'below', horizontal: 'end' })
  })
})
