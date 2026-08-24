import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalSendBackNotice } from './GoalSendBackNotice'

afterEach(cleanup)

describe('GoalSendBackNotice', () => {
  it('reads as a sentence with the manager note', () => {
    render(
      <GoalSendBackNotice reason="Hey, work on the goal titles a bit!" />,
    )

    const note = screen.getByRole('status')
    expect(note).toHaveClass('pd-goals-sendback--sentence')
    expect(note).toHaveTextContent(
      'Sent back for changes: Hey, work on the goal titles a bit!',
    )
  })

  it('names the author in the sentence', () => {
    render(
      <GoalSendBackNotice
        reason="Hey, work on the goal titles a bit!"
        author={{ id: '2', name: 'Line Manager', avatarUrl: '/manager.png' }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sent back for changes by Line Manager: Hey, work on the goal titles a bit!',
    )
    expect(screen.getByRole('img', { name: 'Line Manager' })).toBeInTheDocument()
  })
})
