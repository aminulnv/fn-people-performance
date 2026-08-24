import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalCountNotice } from './GoalCountNotice'

afterEach(cleanup)

describe('GoalCountNotice', () => {
  it('shows the goal-count guidance as a recommendation banner', () => {
    render(
      <GoalCountNotice message="You have 1 goals. This cycle recommends 3 to 5 goals for a balanced cycle." />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Recommendation')
    expect(status).toHaveTextContent('This cycle recommends 3 to 5 goals')
  })
})
