import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import { GoalsTable } from './GoalsTable'

afterEach(cleanup)

const goalWithMeasures: Goal = {
  id: 'g1',
  description: 'Deliver the core People & Culture outcomes',
  weight: 40,
  measurements: [
    {
      id: 'm1',
      kind: 'metric',
      title: 'Primary outcome completion',
      weight: 100,
      unit: 'number',
      direction: 'increase',
      startValue: 0,
      currentValue: 60,
      targetValue: 100,
    },
    {
      id: 't1',
      kind: 'milestone',
      measureGroupId: 'mg1',
      measureTitle: 'Quality process',
      listId: 'l1',
      listTitle: 'Process',
      title: 'Triage incoming defects',
      weight: 0,
      complete: false,
    },
  ],
}

describe('GoalsTable nested measures', () => {
  it('nests metric and milestone rows under the goal with type icons', () => {
    render(
      <GoalsTable
        rows={[{ goal: goalWithMeasures, title: goalWithMeasures.description }]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand Deliver the core People & Culture outcomes',
      }),
    )

    expect(screen.getByRole('img', { name: 'Metric' })).toBeInTheDocument()
    expect(screen.getByText('Primary outcome completion')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Milestone' })).toBeInTheDocument()
    expect(screen.getByText('Quality process')).toBeInTheDocument()
    expect(screen.queryByText('Metric')).not.toBeInTheDocument()
    expect(screen.queryByText('Milestone')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.pd-goals-table__branch')).toHaveLength(2)
  })
})
