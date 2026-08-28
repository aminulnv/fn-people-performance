import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/lib/goals/types'
import {
  GoalMetricTip,
  GoalTableMetricReadout,
  GoalTodoMeasureTip,
} from './GoalMeasurementReadout'
import { measurementPanels } from '@/lib/goals/measurements'

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

  it('builds the OKR-style metric glance', () => {
    render(
      <GoalMetricTip
        metric={{
          id: 'm1',
          kind: 'metric',
          title: 'NPS',
          weight: 100,
          unit: 'number',
          direction: 'increase',
          startValue: 0,
          currentValue: 38,
          targetValue: 95,
          comment: 'Track weekly from the survey',
          proofUrl: 'https://dash.fn/nps',
          progressLog: [
            {
              id: 'log-1',
              recordedAt: '2026-08-20T09:00:00.000Z',
              authorName: 'Ada',
              from: 0,
              to: 38,
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Increase metric')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'NPS' })).toBeInTheDocument()
    expect(screen.getByText('Initial')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('57 to go')).toBeInTheDocument()
    expect(screen.getByText('dash.fn/nps')).toBeInTheDocument()
    expect(screen.getByText('Track weekly from the survey')).toBeInTheDocument()
    expect(screen.getByText(/Ada/)).toBeInTheDocument()
  })

  it('lists checklist tasks in the milestone glance', () => {
    const panel = measurementPanels([
      {
        id: 'ms1',
        kind: 'milestone',
        title: 'Triage incoming defects',
        measureTitle: 'Quality process',
        weight: 100,
        complete: false,
      },
    ])[0]
    if (panel?.kind !== 'todo_measure') throw new Error('expected checklist')

    render(<GoalTodoMeasureTip panel={panel} />)

    expect(screen.getByRole('heading', { name: 'Quality process' })).toBeInTheDocument()
    expect(screen.getByText('Triage incoming defects')).toBeInTheDocument()
    expect(screen.getByText('Items')).toBeInTheDocument()
  })
})
