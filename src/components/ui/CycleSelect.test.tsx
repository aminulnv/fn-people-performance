import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  CycleSelect,
  sanitizeCycleSelection,
  toggleCycleSelection,
  type CycleSelectOption,
} from './CycleSelect'

afterEach(() => {
  cleanup()
})

const OPTIONS: CycleSelectOption[] = [
  {
    id: 'annual-2026',
    label: 'Annual 2026',
    status: 'future',
    statusLabel: 'Future',
    dateLabel: '1 Jan - 15 Feb 2027',
  },
  {
    id: 'q3-2026',
    label: 'Q3 2026',
    status: 'current',
    statusLabel: 'Current',
    dateLabel: '1 Jul - 30 Sep 2026',
  },
  {
    id: 'q2-2026',
    label: 'Q2 2026',
    status: 'previous',
    statusLabel: 'Previous',
    dateLabel: '1 Apr - 30 Jun 2026',
  },
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

  it('can clear the last selection when requireSelection is false', () => {
    expect(
      toggleCycleSelection(['q3-2026'], 'q3-2026', { requireSelection: false }),
    ).toEqual([])
  })
})

describe('CycleSelect', () => {
  it('shows the short date range next to each cycle title', () => {
    render(
      <CycleSelect
        label="Cycle"
        options={OPTIONS}
        value="q3-2026"
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cycle: Q3 2026' }))

    expect(screen.getByText('(1 Jul - 30 Sep 2026)')).toBeInTheDocument()
    expect(screen.getByText('(1 Apr - 30 Jun 2026)')).toBeInTheDocument()
  })

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
    expect(boxes).toHaveLength(OPTIONS.length + 1)
    expect(boxes.filter((box) => (box as HTMLInputElement).checked)).toHaveLength(
      1,
    )

    fireEvent.click(screen.getByRole('option', { name: /Q2 2026/ }))

    expect(onChange).toHaveBeenCalledWith(['q3-2026', 'q2-2026'])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('puts Clear first when empty selection is allowed', () => {
    const onChange = vi.fn()
    render(
      <CycleSelect
        label="Cycle"
        allowEmpty
        emptyLabel="Clear"
        options={OPTIONS}
        value="q3-2026"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cycle: Q3 2026' }))
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAccessibleName('Clear')

    fireEvent.click(options[0])
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('lets multi filters clear every checkbox when empty is allowed', () => {
    const onChange = vi.fn()
    render(
      <CycleSelect
        label="Team"
        multiple
        allowEmpty
        emptyLabel="All teams"
        options={[
          { id: 'core', label: 'Core' },
          { id: 'platform', label: 'Platform' },
        ]}
        value={['core']}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Team: Core' }))
    fireEvent.click(screen.getByRole('option', { name: /Core/ }))

    expect(onChange).toHaveBeenCalledWith([])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('selects and deselects every option from one checkbox', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <CycleSelect
        label="Cycle"
        multiple
        options={OPTIONS}
        value={['q3-2026']}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cycle: Q3 2026' }))
    fireEvent.click(screen.getByRole('option', { name: 'Select All' }))
    expect(onChange).toHaveBeenLastCalledWith(OPTIONS.map((option) => option.id))

    rerender(
      <CycleSelect
        label="Cycle"
        multiple
        options={OPTIONS}
        value={OPTIONS.map((option) => option.id)}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('option', { name: 'Deselect All' }))
    expect(onChange).toHaveBeenLastCalledWith([])
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
