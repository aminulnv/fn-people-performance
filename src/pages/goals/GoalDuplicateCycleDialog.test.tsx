import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalDuplicateCycleDialog } from './GoalDuplicateCycleDialog'

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>(
    '@/components/ui',
  )
  return {
    ...actual,
    Modal: ({
      open,
      title,
      children,
      actions,
    }: {
      open: boolean
      title: string
      children?: ReactNode
      actions?: ReactNode
    }) =>
      open ? (
        <div role="dialog" aria-label={title}>
          {children}
          {actions}
        </div>
      ) : null,
  }
})

afterEach(cleanup)

const cycles = [
  { id: 'c1', label: 'Q3 2026', statusLabel: 'Current' },
  { id: 'c2', label: 'Annual 2026', statusLabel: 'Current' },
]

describe('GoalDuplicateCycleDialog', () => {
  it('duplicates into the selected cycle', () => {
    const onConfirm = vi.fn()
    render(
      <GoalDuplicateCycleDialog
        open
        cycles={cycles}
        defaultCycleId="c1"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.change(screen.getByLabelText('Cycle'), { target: { value: 'c2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }))

    expect(onConfirm).toHaveBeenCalledWith('c2')
  })
})
