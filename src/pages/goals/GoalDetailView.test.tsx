import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalDetailView } from './GoalDetailView'

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

const goal: Goal = {
  id: 'goal-1',
  description: 'Improve delivery quality',
  weight: 100,
  measurements: [],
}

describe('GoalDetailView', () => {
  it('shows submission status without per-goal approve actions', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cycleLabel="Q3 2026"
        status="submitted"
        commentAuthorName="Manager"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Send Back' }),
    ).not.toBeInTheDocument()
  })

  it('shows the cascading goal from the line manager', () => {
    render(
      <GoalDetailView
        goal={{
          ...goal,
          cascadedFromGoalId: 'mgr-1',
          linkedGoalLabel: 'Raise quality bar',
        }}
        index={0}
        total={1}
        owner={{ name: 'Aminul Islam Borhan' }}
        cascadeFrom={{
          managerName: 'Line Manager',
          options: [
            {
              id: 'mgr-1',
              title: 'Raise quality bar',
              managerName: 'Line Manager',
            },
          ],
        }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Aminul"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    const from = screen.getByLabelText('Cascading from')
    expect(from).toHaveTextContent('Raise quality bar')
    expect(from).toHaveTextContent('Line Manager')
    expect(screen.getByRole('img', { name: 'Line Manager' })).toBeInTheDocument()
  })

  it('shows who this goal was cascaded to', () => {
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Line Manager' }}
        cascadedTo={[
          {
            goalId: 'c1',
            goalTitle: 'Untitled Cascading Goal from Line Manager',
            personId: 'r1',
            personName: 'Direct Report',
          },
          {
            goalId: 'c2',
            goalTitle: 'Cut defects',
            personId: 'r2',
            personName: 'Second Report',
          },
        ]}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    const to = screen.getByLabelText('Cascaded to')
    expect(to).toHaveTextContent('Untitled Cascading Goal from Line Manager')
    expect(to).toHaveTextContent('Direct Report')
    expect(to).toHaveTextContent('Cut defects')
    expect(to).toHaveTextContent('Second Report')
    expect(screen.getByRole('img', { name: 'Direct Report' })).toBeInTheDocument()
  })

  it('makes cascaded goal names open the other person’s goal', () => {
    render(
      <MemoryRouter>
        <GoalDetailView
          goal={goal}
          index={0}
          total={1}
          owner={{ name: 'Line Manager' }}
          cascadedTo={[
            {
              goalId: 'c1',
              goalTitle: 'Cut defects',
              personId: 'r1',
              personName: 'Direct Report',
            },
          ]}
          cascadeHref={(personId, goalId) => `/goals/q3/${personId}/${goalId}`}
          cycleLabel="Q3 2026"
          status="draft"
          commentAuthorName="Line Manager"
          onChange={vi.fn()}
          onSelectIndex={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Cut defects · Direct Report' }),
    ).toHaveAttribute('href', '/goals/q3/r1/c1')
  })

  it('asks which reports should receive a cascaded copy', () => {
    const onCascade = vi.fn()
    render(
      <GoalDetailView
        goal={goal}
        index={0}
        total={1}
        owner={{ name: 'Line Manager' }}
        cycleLabel="Q3 2026"
        status="draft"
        commentAuthorName="Line Manager"
        canCascade
        cascadeTargets={[
          { id: '1', name: 'Direct Report', title: 'Executive' },
          { id: '3', name: 'Second Report', title: 'Executive' },
        ]}
        onCascade={onCascade}
        onChange={vi.fn()}
        onSelectIndex={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cascade This Goal' }))

    expect(
      screen.getByRole('dialog', { name: 'Cascade this goal' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Direct Report/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascade' }))

    expect(onCascade).toHaveBeenCalledWith(['1'])
  })
})
