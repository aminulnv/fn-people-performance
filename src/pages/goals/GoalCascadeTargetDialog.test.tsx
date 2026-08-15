import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalCascadeTargetDialog } from './GoalCascadeTargetDialog'

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

const targets = [
  { id: '1', name: 'Direct Report', title: 'Executive' },
  { id: '3', name: 'Second Report', title: 'Executive' },
]

describe('GoalCascadeTargetDialog', () => {
  it('does not cascade until a report is selected', () => {
    const onConfirm = vi.fn()
    render(
      <GoalCascadeTargetDialog
        open
        targets={targets}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('button', { name: 'Cascade' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Second Report/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascade' }))

    expect(onConfirm).toHaveBeenCalledWith(['3'])
  })
})
