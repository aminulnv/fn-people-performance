import { describe, expect, it } from 'vitest'
import type { Metric, Milestone } from '@/lib/goals/types'
import {
  measurePanelKindLabel,
  measurePanelLatestProgressAt,
  measurePanelProgressLog,
  measurePanelTableWeight,
} from './measurePanelDisplay'

const metric: Metric = {
  id: 'm1',
  kind: 'metric',
  title: 'Defects closed',
  weight: 100,
  unit: 'number',
  direction: 'increase',
  startValue: 0,
  targetValue: 80,
  currentValue: 10,
  progressLog: [
    {
      id: 'a',
      recordedAt: '2026-08-13T00:00:00.000Z',
      authorName: 'Ada',
      to: 10,
    },
  ],
}

const todo: Milestone = {
  id: 't1',
  kind: 'milestone',
  title: 'Triage incoming defects',
  weight: 50,
  complete: false,
  progressLog: [
    {
      id: 'b',
      recordedAt: '2026-08-10T00:00:00.000Z',
      authorName: 'Ada',
      to: 1,
      label: 'Triage incoming defects',
    },
  ],
}

describe('measurePanelKindLabel', () => {
  it('labels a number panel as Metric', () => {
    expect(
      measurePanelKindLabel({
        key: 'metric',
        kind: 'metric',
        metric,
      }),
    ).toBe('Metric')
  })

  it('labels a todo panel as Milestone', () => {
    expect(
      measurePanelKindLabel({
        key: 'todos',
        kind: 'todo_measure',
        measureGroupId: 'g1',
        title: 'Quality process',
        weight: 50,
        lists: [],
      }),
    ).toBe('Milestone')
  })
})

describe('measurePanelProgressLog', () => {
  it('returns the metric log', () => {
    expect(
      measurePanelProgressLog({
        key: 'metric',
        kind: 'metric',
        metric,
      }),
    ).toEqual(metric.progressLog)
  })

  it('flattens todo logs on a milestone measure', () => {
    expect(
      measurePanelProgressLog({
        key: 'todos',
        kind: 'todo_measure',
        measureGroupId: 'g1',
        title: 'Quality process',
        weight: 50,
        lists: [
          {
            listKey: 'l1',
            listTitle: 'Process',
            todos: [todo],
          },
        ],
      }),
    ).toEqual(todo.progressLog)
  })
})

describe('measurePanelTableWeight', () => {
  it('locks a solo measure at 100 percent', () => {
    expect(
      measurePanelTableWeight(
        {
          key: 'metric',
          kind: 'metric',
          metric: { ...metric, weight: 40 },
        },
        1,
      ),
    ).toBe(100)
  })

  it('keeps the panel weight when several measures share the goal', () => {
    expect(
      measurePanelTableWeight(
        {
          key: 'metric',
          kind: 'metric',
          metric: { ...metric, weight: 40 },
        },
        2,
      ),
    ).toBe(40)
  })
})

describe('measurePanelLatestProgressAt', () => {
  it('reads the metric progress log', () => {
    expect(
      measurePanelLatestProgressAt({
        key: 'metric',
        kind: 'metric',
        metric,
      }),
    ).toBe('2026-08-13T00:00:00.000Z')
  })

  it('reads the newest log across todos in a measure', () => {
    expect(
      measurePanelLatestProgressAt({
        key: 'todos',
        kind: 'todo_measure',
        measureGroupId: 'g1',
        title: 'Quality process',
        weight: 50,
        lists: [
          {
            listKey: 'l1',
            listTitle: 'Process',
            todos: [
              todo,
              {
                ...todo,
                id: 't2',
                progressLog: [
                  {
                    id: 'c',
                    recordedAt: '2026-08-16T00:00:00.000Z',
                    authorName: 'Ada',
                    to: 1,
                    label: 'Keep reopen rate down',
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe('2026-08-16T00:00:00.000Z')
  })
})
