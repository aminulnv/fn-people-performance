import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalEmptyActions } from './GoalEmptyActions'

afterEach(cleanup)

describe('GoalEmptyActions', () => {
  it('offers to copy an available previous cycle', () => {
    const onCopyPrevious = vi.fn()
    render(
      <GoalEmptyActions
        busy={false}
        previousCycleLabel="Q2 2026"
        onAdd={vi.fn()}
        onCopyPrevious={onCopyPrevious}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Last Cycle' }))

    expect(onCopyPrevious).toHaveBeenCalledOnce()
  })

  it('hides copy when no previous cycle has goals', () => {
    render(
      <GoalEmptyActions
        busy={false}
        onAdd={vi.fn()}
        onCopyPrevious={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Copy Last Cycle' }),
    ).not.toBeInTheDocument()
  })
})
