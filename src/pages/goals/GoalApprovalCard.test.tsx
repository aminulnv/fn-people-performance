import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GoalApprovalCard } from './GoalApprovalCard'

afterEach(cleanup)

describe('GoalApprovalCard', () => {
  it('shows pending approval with the named manager', () => {
    render(
      <MemoryRouter>
        <GoalApprovalCard
          status="submitted"
          cascadeFrom={{
            managerId: 'm1',
            managerName: 'Sheikh Mohammed Fahim',
            managerAvatarUrl: '',
            skipLevelManagerId: null,
            skipLevelManagerName: null,
            skipLevelManagerAvatarUrl: null,
            options: [],
          }}
        />
      </MemoryRouter>,
    )

    const card = document.querySelector('.pd-goal-view__approval--pending')
    expect(card).not.toBeNull()
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByText('Sheikh Mohammed Fahim')).toBeInTheDocument()
  })

  it('names final approval when the skip-level stage is open', () => {
    render(
      <MemoryRouter>
        <GoalApprovalCard
          status="submitted"
          postWindowApprovalStage="manager_manager"
          cascadeFrom={{
            managerId: 'm1',
            managerName: 'Line Manager',
            managerAvatarUrl: '',
            skipLevelManagerId: 's1',
            skipLevelManagerName: 'Skip Level',
            skipLevelManagerAvatarUrl: '',
            options: [],
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Pending final approval')).toBeInTheDocument()
    expect(screen.getByText('Skip Level')).toBeInTheDocument()
  })
})
