import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  CycleSelect,
  sanitizeCycleSelection,
  toggleCycleSelection,
  type CycleSelectOption,
} from './CycleSelect'

const OPTIONS: CycleSelectOption[] = [
  { id: 'annual-2026', label: 'Annual 2026', status: 'future', statusLabel: 'Future' },
  { id: 'q3-2026', label: 'Q3 2026', status: 'current', statusLabel: 'Current' },
  { id: 'q2-2026', label: 'Q2 2026', status: 'previous', statusLabel: 'Previous' },
]

describe('sanitizeCycleSelection', () => {
  it('keeps known ids and falls back to the current cycle', () => {
    expect(
      sanitizeCycleSelection(['gone', 'q3-2026'], ['q3-2026', 'q2-2026'], 'q3-2026'),
    ).toEqual(['q3-2026'])
    expect(
      sanitizeCycleSelection(['gone'], ['q2-2026'], 'q3-2026'),
    ).toEqual(['q2-2026'])
  })
})

describe('toggleCycleSelection', () => {
  it('adds a cycle and will not clear the last one', () => {
    expect(toggleCycleSelection(['q3-2026'], 'q2-2026')).toEqual([
      'q3-2026',
      'q2-2026',
    ])
    expect(toggleCycleSelection(['q3-2026'], 'q3-2026')).toEqual(['q3-2026'])
  })
})

describe('CycleSelect', () => {
  it('keeps the menu open while toggling multiple cycles', () => {
    const onChange = vi.fn()
    render(
      <CycleSelect
        label="Cycle"
        multiple
        options={OPTIONS}
        value={['q3-2026']}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cycle: Q3 2026' }))

    const boxes = screen.getAllByRole('checkbox', { hidden: true })
    expect(boxes).toHaveLength(OPTIONS.length)
    expect(boxes.filter((box) => (box as HTMLInputElement).checked)).toHaveLength(
      1,
    )

    fireEvent.click(screen.getByRole('option', { name: /Q2 2026/ }))

    expect(onChange).toHaveBeenCalledWith(['q3-2026', 'q2-2026'])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('summarizes more than one selected cycle on the trigger', () => {
    render(
      <CycleSelect
        label="Cycle"
        multiple
        options={OPTIONS}
        value={['q3-2026', 'q2-2026']}
        onChange={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Cycle: Q3 2026 and 1 more' }),
    ).toBeInTheDocument()
    expect(screen.getByText('+ 1 more')).toBeInTheDocument()
  })
})
