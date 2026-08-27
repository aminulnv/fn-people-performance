import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalEditLockNotice } from './GoalEditLockNotice'

afterEach(cleanup)

describe('GoalEditLockNotice', () => {
  it('reads as a Late Submission-style banner', () => {
    render(
      <GoalEditLockNotice
        layout="ribbon"
        message="Q2 2026 is closed, so goals are read-only."
      />,
    )

    const banner = screen.getByRole('status', {
      name: 'Q2 2026 is closed, so goals are read-only.',
    })
    expect(banner).toHaveClass('pd-goals-banner--lock')
    expect(banner).toHaveClass('pd-goals-banner--ribbon')
    expect(banner).toHaveTextContent('Read Only')
    expect(banner).toHaveTextContent('Q2 2026 is closed, so goals are read-only.')
  })
})
