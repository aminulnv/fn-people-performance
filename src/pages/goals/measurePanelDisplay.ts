import {
  METRIC_UNITS,
  todoMeasureItems,
  type MeasurementPanel,
} from '@/lib/goals/measurements'
import { latestProgressLogAt } from '@/lib/goals/progressLog'
import type { ProgressLogEntry } from '@/lib/goals/types'
import { measurementProgress } from '@/lib/goals/weightage'
import { formatMetricNumber } from '@/pages/goals/goalHelpers'

export { hasMeasurePanelName } from '@/lib/goals/measurements'

export function measurePanelName(panel: MeasurementPanel): string {
  if (panel.kind === 'metric') {
    return panel.metric.title.trim()
  }
  return panel.title.trim()
}

export function measurePanelKindLabel(panel: MeasurementPanel): 'Metric' | 'Milestone' {
  return panel.kind === 'metric' ? 'Metric' : 'Milestone'
}

export function measurePanelListLabel(
  panel: MeasurementPanel,
  index: number,
): string {
  const name = measurePanelName(panel)
  return name ? `${index + 1}. ${name}` : `${index + 1}.`
}

export function measurePanelUnit(panel: MeasurementPanel): string {
  if (panel.kind === 'metric') {
    return (
      METRIC_UNITS.find((unit) => unit.value === panel.metric.unit)?.label ??
      panel.metric.unit
    )
  }
  return 'Checkbox'
}

export function measurePanelMetricLine(panel: MeasurementPanel): string {
  if (panel.kind !== 'metric') return ''
  const metric = panel.metric
  return [
    formatMetricNumber(metric.startValue),
    formatMetricNumber(metric.currentValue),
    formatMetricNumber(metric.targetValue),
  ].join(' → ')
}

export function measurePanelProgressLog(
  panel: MeasurementPanel,
): ProgressLogEntry[] {
  if (panel.kind === 'metric') return panel.metric.progressLog ?? []
  return todoMeasureItems(panel).flatMap((todo) => todo.progressLog ?? [])
}

export function measurePanelLatestProgressAt(
  panel: MeasurementPanel,
): string | undefined {
  if (panel.kind === 'metric') {
    return latestProgressLogAt([panel.metric])
  }
  return latestProgressLogAt(todoMeasureItems(panel))
}

/** Nested table rows lock a solo measure at 100%; otherwise use the panel weight. */
export function measurePanelTableWeight(
  panel: MeasurementPanel,
  panelCount: number,
): number {
  if (panelCount === 1) return 100
  return panel.kind === 'metric' ? panel.metric.weight : panel.weight
}

export function measurePanelProgress(panel: MeasurementPanel): number {
  if (panel.kind === 'metric') {
    return Math.round(measurementProgress(panel.metric))
  }
  const todos = todoMeasureItems(panel)
  if (todos.length === 0) return 0
  const weightTotal = todos.reduce((sum, todo) => sum + todo.weight, 0)
  if (weightTotal <= 0) {
    const average =
      todos.reduce((sum, todo) => sum + measurementProgress(todo), 0) /
      todos.length
    return Math.round(average)
  }
  const weighted = todos.reduce(
    (sum, todo) => sum + measurementProgress(todo) * todo.weight,
    0,
  )
  return Math.round(weighted / weightTotal)
}
