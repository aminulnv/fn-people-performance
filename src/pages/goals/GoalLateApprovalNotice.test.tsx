import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GoalLateApprovalNotice } from './GoalLateApprovalNotice'

afterEach(cleanup)

const manager = { id: 'p2', name: 'Rifat Ahmed' }
const skipLevelManager = { id: 'p3', name: 'Nafis Karim' }

function renderNotice(stage: 'manager' | 'manager_manager') {
  render(
    <MemoryRouter>
      <GoalLateApprovalNotice
        stage={stage}
        manager={manager}
        skipLevelManager={skipLevelManager}
      />
    </MemoryRouter>,
  )
}

describe('GoalLateApprovalNotice', () => {
  it('names both approvers while the direct manager review is pending', () => {
    renderNotice('manager')
    expect(screen.getByRole('link', { name: /Rifat Ahmed/ })).toHaveAttribute(
      'href',
      '/people/p2',
    )
    expect(screen.getByRole('link', { name: /Nafis Karim/ })).toBeInTheDocument()
  })

  it('links to the skip-level manager once the direct manager approved', () => {
    renderNotice('manager_manager')
    expect(screen.getByText('Pending Final Approval')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nafis Karim/ })).toHaveAttribute(
      'href',
      '/people/p3',
    )
  })

  it('falls back to role wording when the approver is unknown', () => {
    render(
      <MemoryRouter>
        <GoalLateApprovalNotice stage="manager_manager" manager={manager} />
      </MemoryRouter>,
    )
    expect(
      screen.getByText(/the skip-level manager/, { exact: false }),
    ).toBeInTheDocument()
  })
})
