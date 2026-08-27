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
      'Sent Back For Changes: Hey, work on the goal titles a bit!',
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
      'Sent Back For Changes by Line Manager: Hey, work on the goal titles a bit!',
    )
    expect(screen.getByRole('img', { name: 'Line Manager' })).toBeInTheDocument()
  })

  it('renders a flush ribbon when asked', () => {
    render(
      <GoalSendBackNotice
        layout="ribbon"
        reason="Hey, work on the goal titles a bit!"
      />,
    )

    const note = screen.getByRole('status')
    expect(note).toHaveClass('pd-goals-sendback--ribbon')
    expect(note).toHaveClass('pd-goals-banner--sendback')
    expect(note).toHaveTextContent(
      'Sent Back For Changes: Hey, work on the goal titles a bit!',
    )
  })
})
