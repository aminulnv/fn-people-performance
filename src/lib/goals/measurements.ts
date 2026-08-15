import type {
  Goal,
  Measurement,
  Metric,
  MetricDirection,
  MetricStrategy,
  MetricUnit,
  Milestone,
} from './types'

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const METRIC_STRATEGIES: {
  id: MetricStrategy
  label: string
}[] = [
  { id: 'increase', label: 'Increase' },
  { id: 'decrease', label: 'Decrease' },
  { id: 'between', label: 'Between' },
  { id: 'keep_above', label: 'Keep above' },
  { id: 'keep_below', label: 'Keep below' },
]

export const METRIC_UNITS: { value: MetricUnit; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: '%', label: 'Percent (%)' },
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'currency', label: 'Currency' },
]

/** Map stored / legacy direction values onto Revolut strategies. */
export function normalizeMetricStrategy(
  direction: MetricDirection,
): MetricStrategy {
  switch (direction) {
    case 'greater_than':
    case 'increase':
      return 'increase'
    case 'less_than':
    case 'decrease':
      return 'decrease'
    case 'within_range':
    case 'between':
      return 'between'
    case 'keep_above':
      return 'keep_above'
    case 'keep_below':
      return 'keep_below'
    default:
      return 'increase'
  }
}

export function strategyLabel(direction: MetricDirection): string {
  const strategy = normalizeMetricStrategy(direction)
  return METRIC_STRATEGIES.find((item) => item.id === strategy)?.label ?? strategy
}

export function blankMilestone(weight = 0): Milestone {
  return {
    id: createId('ms'),
    kind: 'milestone',
    title: '',
    weight,
    complete: false,
  }
}

export function blankMetric(
  strategy: MetricStrategy = 'increase',
  weight = 0,
): Metric {
  return {
    id: createId('metric'),
    kind: 'metric',
    title: '',
    weight,
    unit: 'number',
    direction: strategy,
    startValue: undefined,
    targetValue: undefined,
    currentValue: undefined,
    rangeMin: undefined,
    rangeMax: undefined,
  }
}

export function blankGoal(options?: {
  withDefaultMetric?: boolean
  ownerId?: string
}): Goal {
  const withDefaultMetric = options?.withDefaultMetric ?? true
  return {
    id: createId('goal'),
    description: '',
    weight: 0,
    ownerId: options?.ownerId,
    progressStatus: 'on_track',
    measurements: withDefaultMetric
      ? rebalanceMeasurementWeights([blankMetric('increase')])
      : [],
  }
}

/** Split 100% evenly across measurements (last gets remainder). */
export function rebalanceMeasurementWeights(
  measurements: Measurement[],
): Measurement[] {
  if (measurements.length === 0) return measurements
  const each = Math.floor(100 / measurements.length)
  const remainder = 100 - each * measurements.length
  return measurements.map((measurement, index) => ({
    ...measurement,
    weight: each + (index === measurements.length - 1 ? remainder : 0),
  }))
}

export function applyMetricStrategy(
  metric: Metric,
  strategy: MetricStrategy,
): Metric {
  const next: Metric = {
    ...metric,
    direction: strategy,
  }

  if (strategy === 'between') {
    return {
      ...next,
      rangeMin: metric.rangeMin ?? metric.startValue,
      rangeMax: metric.rangeMax ?? metric.targetValue,
    }
  }

  if (strategy === 'keep_above') {
    const threshold = metric.rangeMin ?? metric.targetValue
    return {
      ...next,
      rangeMin: threshold,
      rangeMax: undefined,
      targetValue: threshold,
    }
  }

  if (strategy === 'keep_below') {
    const threshold = metric.rangeMax ?? metric.targetValue
    return {
      ...next,
      rangeMax: threshold,
      rangeMin: undefined,
      targetValue: threshold,
    }
  }

  return {
    ...next,
    rangeMin: undefined,
    rangeMax: undefined,
  }
}

export function metricUsesRange(strategy: MetricStrategy): boolean {
  return (
    strategy === 'between' ||
    strategy === 'keep_above' ||
    strategy === 'keep_below'
  )
}

export function metricLowerLabel(strategy: MetricStrategy): string {
  if (strategy === 'increase' || strategy === 'decrease') return 'Start value'
  if (strategy === 'keep_below') return 'Lower limit'
  return 'Lower limit'
}

export function metricUpperLabel(strategy: MetricStrategy): string {
  if (strategy === 'increase' || strategy === 'decrease') return 'Target value'
  if (strategy === 'keep_above') return 'Upper limit'
  return 'Upper limit'
}
