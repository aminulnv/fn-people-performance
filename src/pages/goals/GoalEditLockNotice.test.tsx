import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalEditLockNotice } from './GoalEditLockNotice'

afterEach(cleanup)

describe('GoalEditLockNotice', () => {
  it('reads as an Action Required-style ribbon', () => {
    render(
      <GoalEditLockNotice
        layout="ribbon"
        message="Q2 2026 is closed, so goals are read-only."
      />,
    )

    const banner = screen.getByRole('status', {
      name: 'Q2 2026 is closed, so goals are read-only.',
    })
    expect(banner).toHaveClass('pd-goals-sendback--ribbon')
    expect(banner).toHaveClass('pd-goals-banner--lock')
    expect(banner).toHaveClass('pd-goals-banner--ribbon')
    expect(banner).toHaveTextContent('Read Only')
    expect(banner).toHaveTextContent('Q2 2026 is closed, so goals are read-only.')
  })

  it('uses the compact Action Required card when not asked for a ribbon', () => {
    render(
      <GoalEditLockNotice message="Q2 2026 is closed, so goals are read-only." />,
    )

    const banner = screen.getByRole('status', {
      name: 'Q2 2026 is closed, so goals are read-only.',
    })
    expect(banner).toHaveClass('pd-goals-sendback--lock')
    expect(banner).toHaveClass('pd-goals-sendback--compact')
    expect(banner).not.toHaveClass('pd-goals-sendback--ribbon')
  })
})
