import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalTableMetricReadout } from './GoalMeasurementReadout'

afterEach(cleanup)

const untitled: Goal = {
  id: 'g1',
  description: 'Ship reviews',
  weight: 100,
  measurements: [],
}

describe('GoalTableMetricReadout', () => {
  it('shows current and target with a now/target split, not an arrow chain', () => {
    render(
      <GoalTableMetricReadout
        goal={{
          ...untitled,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 100,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 38,
              targetValue: 95,
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByLabelText('Current 38 of target 95'),
    ).toBeInTheDocument()
    expect(screen.queryByText('now')).not.toBeInTheDocument()
    expect(screen.queryByText('target')).not.toBeInTheDocument()
    expect(screen.queryByText('0 → 38 → 95')).not.toBeInTheDocument()
  })

  it('shows every numeric metric in the goal', () => {
    render(
      <GoalTableMetricReadout
        goal={{
          ...untitled,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              weight: 50,
              unit: 'number',
              direction: 'increase',
              startValue: 0,
              currentValue: 38,
              targetValue: 95,
            },
            {
              id: 'm2',
              kind: 'metric',
              title: 'Revenue',
              weight: 50,
              unit: 'currency',
              direction: 'increase',
              startValue: 1,
              currentValue: 2,
              targetValue: 3,
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByLabelText('Current 38 of target 95'),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Current 2 of target 3'),
    ).toBeInTheDocument()
  })

  it('reuses the milestone done/left readout instead of 0 → 1', () => {
    render(
      <GoalTableMetricReadout
        goal={{
          ...untitled,
          measurements: [
            {
              id: 'ms1',
              kind: 'milestone',
              title: 'test',
              measureTitle: 'jnkjn',
              weight: 100,
              complete: false,
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByLabelText('0 of 1 tasks done, 1 left'),
    ).toBeInTheDocument()
    expect(screen.queryByText('done')).not.toBeInTheDocument()
    expect(screen.queryByText('left')).not.toBeInTheDocument()
    expect(screen.queryByText('0 → 1')).not.toBeInTheDocument()
  })
})
