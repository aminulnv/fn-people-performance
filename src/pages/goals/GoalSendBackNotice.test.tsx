import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalSendBackNotice } from './GoalSendBackNotice'

afterEach(cleanup)

describe('GoalSendBackNotice', () => {
  it('shows the manager note separately from the status title', () => {
    render(
      <GoalSendBackNotice reason="Hey, work on the goal titles a bit!" />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Sent back for changes')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Hey, work on the goal titles a bit!',
    )
    expect(screen.getByRole('status')).not.toHaveTextContent(
      'Sent back: Hey, work on the goal titles a bit!',
    )
  })

  it('shows the author name and avatar inside the note', () => {
    render(
      <GoalSendBackNotice
        reason="Hey, work on the goal titles a bit!"
        author={{ id: '2', name: 'Line Manager', avatarUrl: '/manager.png' }}
      />,
    )

    expect(screen.getByText('Line Manager')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Line Manager' })).toBeInTheDocument()
  })
})
