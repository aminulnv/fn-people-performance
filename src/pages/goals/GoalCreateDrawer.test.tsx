import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GoalCreateDrawer } from './GoalCreateDrawer'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('GoalCreateDrawer', () => {
  it('renders goal creation content in a dialog', () => {
    render(
      <GoalCreateDrawer onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    expect(screen.getByRole('dialog', { name: 'Add goal' })).toHaveTextContent(
      'Goal fields',
    )
  })

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <GoalCreateDrawer onClose={onClose}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the background is clicked', () => {
    const onClose = vi.fn()
    render(
      <GoalCreateDrawer onClose={onClose}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel adding goal' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('uses view-specific accessible labels when provided', () => {
    render(
      <GoalCreateDrawer
        label="View Improve delivery"
        closeLabel="Close goal"
        onClose={() => undefined}
      >
        <p>Goal details</p>
      </GoalCreateDrawer>,
    )

    expect(
      screen.getByRole('dialog', { name: 'View Improve delivery' }),
    ).toBeInTheDocument()
  })

  it('widens with the keyboard from its resize handle', () => {
    render(
      <GoalCreateDrawer onClose={() => undefined}>
        <p>Goal details</p>
      </GoalCreateDrawer>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Add goal' })

    fireEvent.keyDown(
      screen.getByRole('separator', { name: 'Resize goal panel' }),
      { key: 'ArrowLeft' },
    )

    expect(dialog).toHaveStyle({ width: '768px' })
  })
})
