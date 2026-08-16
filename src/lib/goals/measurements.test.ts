import { describe, expect, it } from 'vitest'
import {
  applyMetricStrategy,
  blankMetric,
  blankMilestone,
  measurementPanels,
  normalizeMetricStrategy,
  rebalanceMeasurementWeights,
} from './measurements'
import { measurementProgress } from './weightage'
import type { Metric } from './types'

function metric(partial: Partial<Metric> & Pick<Metric, 'direction'>): Metric {
  return {
    id: 'm1',
    kind: 'metric',
    title: 'Metric',
    weight: 100,
    unit: 'number',
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    ...partial,
  }
}

describe('normalizeMetricStrategy', () => {
  it('maps legacy directions to Revolut strategies', () => {
    expect(normalizeMetricStrategy('greater_than')).toBe('increase')
    expect(normalizeMetricStrategy('less_than')).toBe('decrease')
    expect(normalizeMetricStrategy('within_range')).toBe('between')
  })

  it('keeps modern strategies unchanged', () => {
    expect(normalizeMetricStrategy('keep_above')).toBe('keep_above')
    expect(normalizeMetricStrategy('keep_below')).toBe('keep_below')
    expect(normalizeMetricStrategy('increase')).toBe('increase')
  })
})

describe('measurementProgress strategies', () => {
  it('interpolates increase toward the target', () => {
    expect(
      measurementProgress(
        metric({
          direction: 'increase',
          startValue: 0,
          targetValue: 100,
          currentValue: 40,
        }),
      ),
    ).toBe(40)
    expect(
      measurementProgress(
        metric({
          direction: 'greater_than',
          startValue: 0,
          targetValue: 80,
          currentValue: 80,
        }),
      ),
    ).toBe(100)
  })

  it('interpolates decrease toward the target', () => {
    expect(
      measurementProgress(
        metric({
          direction: 'decrease',
          startValue: 100,
          targetValue: 40,
          currentValue: 70,
        }),
      ),
    ).toBe(50)
    expect(
      measurementProgress(
        metric({
          direction: 'less_than',
          startValue: 20,
          targetValue: 10,
          currentValue: 5,
        }),
      ),
    ).toBe(100)
  })

  it('treats between as a binary range check', () => {
    expect(
      measurementProgress(
        metric({
          direction: 'between',
          rangeMin: 10,
          rangeMax: 20,
          currentValue: 15,
        }),
      ),
    ).toBe(100)
    expect(
      measurementProgress(
        metric({
          direction: 'within_range',
          rangeMin: 10,
          rangeMax: 20,
          currentValue: 21,
        }),
      ),
    ).toBe(0)
  })

  it('treats keep above / keep below as thresholds', () => {
    expect(
      measurementProgress(
        metric({
          direction: 'keep_above',
          rangeMin: 50,
          targetValue: 50,
          currentValue: 50,
        }),
      ),
    ).toBe(100)
    expect(
      measurementProgress(
        metric({
          direction: 'keep_above',
          rangeMin: 50,
          currentValue: 49,
        }),
      ),
    ).toBe(0)
    expect(
      measurementProgress(
        metric({
          direction: 'keep_below',
          rangeMax: 30,
          targetValue: 30,
          currentValue: 30,
        }),
      ),
    ).toBe(100)
    expect(
      measurementProgress(
        metric({
          direction: 'keep_below',
          rangeMax: 30,
          currentValue: 31,
        }),
      ),
    ).toBe(0)
  })

  it('scores milestones as complete or not', () => {
    expect(
      measurementProgress({
        id: 'ms1',
        kind: 'milestone',
        title: 'Ship',
        weight: 100,
        complete: true,
      }),
    ).toBe(100)
    expect(
      measurementProgress({
        id: 'ms2',
        kind: 'milestone',
        title: 'Ship',
        weight: 100,
        complete: false,
      }),
    ).toBe(0)
  })
})

describe('measurement factories', () => {
  it('creates blank metric and milestone shapes', () => {
    const numberMetric = blankMetric('between', 50)
    expect(numberMetric.kind).toBe('metric')
    expect(numberMetric.direction).toBe('between')
    expect(numberMetric.weight).toBe(50)
    expect(numberMetric.rangeMin).toBeUndefined()
    expect(numberMetric.rangeMax).toBeUndefined()
    expect(numberMetric.startValue).toBeUndefined()
    expect(numberMetric.targetValue).toBeUndefined()

    const todo = blankMilestone(25)
    expect(todo.kind).toBe('milestone')
    expect(todo.weight).toBe(25)
    expect(todo.complete).toBe(false)
  })

  it('rebalances mixed measurement modes evenly to 100', () => {
    const balanced = rebalanceMeasurementWeights([
      blankMetric('increase'),
      blankMilestone(),
      blankMetric('decrease'),
    ])
    expect(balanced.map((m) => m.weight)).toEqual([33, 33, 34])
  })

  it('uses one shared distribution for number metrics and to-dos', () => {
    const balanced = rebalanceMeasurementWeights([
      blankMetric('increase'),
      blankMilestone(),
      blankMilestone(),
      blankMetric('between'),
    ])

    expect(balanced.map((measurement) => measurement.weight)).toEqual([
      25, 25, 25, 25,
    ])
  })

  it('applies strategy-specific range defaults', () => {
    const base = blankMetric('increase', 100)
    base.startValue = 5
    base.targetValue = 15

    const between = applyMetricStrategy(base, 'between')
    expect(between.direction).toBe('between')
    expect(between.rangeMin).toBe(5)
    expect(between.rangeMax).toBe(15)

    const keepAbove = applyMetricStrategy(base, 'keep_above')
    expect(keepAbove.rangeMin).toBe(15)
    expect(keepAbove.targetValue).toBe(15)

    const keepBelow = applyMetricStrategy(base, 'keep_below')
    expect(keepBelow.rangeMax).toBe(15)
    expect(keepBelow.targetValue).toBe(15)
  })
})

describe('measurementPanels', () => {
  it('places the to-do block where the first milestone sits', () => {
    const first = blankMetric('increase')
    const todo = blankMilestone()
    const second = blankMetric('decrease')
    const panels = measurementPanels([first, todo, second])

    expect(panels.map((panel) => panel.kind)).toEqual([
      'metric',
      'todos',
      'metric',
    ])
    expect(panels[0]).toMatchObject({ kind: 'metric', metric: first })
    expect(panels[1]).toMatchObject({ kind: 'todos', todos: [todo] })
    expect(panels[2]).toMatchObject({ kind: 'metric', metric: second })
  })
})
