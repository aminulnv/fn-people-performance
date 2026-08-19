import type { ReactNode } from 'react'
import { ListboxSelect } from '@/components/ui'
import { METRIC_UNITS } from '@/lib/goals/measurements'
import type { Metric, MetricUnit } from '@/lib/goals/types'
import { measurementProgress } from '@/lib/goals/weightage'
import {
  GoalMetricReadout,
  GoalWeightInput,
} from '@/pages/goals/GoalMeasurementReadout'
import { trackLabel } from '@/pages/goals/goalHelpers'
import { MeasureTitleField } from '@/pages/goals/MeasureTitleField'
import { NumberTargetEditor } from '@/pages/goals/NumberTargetEditor'

export function NumberMeasureEditCard({
  metric,
  onChange,
  meta,
  cardClassName = 'pd-goal-view__card pd-goal-measure-card pd-goal-measure-card--edit',
  headClassName = 'pd-goal-view__card-head',
  titleClassName = 'pd-goal-view__card-title',
  metricsClassName = 'pd-goal-view__card-metrics',
}: {
  metric: Metric
  onChange: (next: Metric) => void
  meta?: ReactNode
  cardClassName?: string
  headClassName?: string
  titleClassName?: string
  metricsClassName?: string
}) {
  const trimmedTitle = metric.title.trim()
  const weightLabel = trimmedTitle ? `Weight for ${trimmedTitle}` : 'Weight'
  const track = trackLabel('draft', Math.round(measurementProgress(metric)), 'on_track')

  return (
    <section className={cardClassName} aria-label={trimmedTitle || 'Measure'}>
      <div className={headClassName}>
        <div className={titleClassName}>
          <MeasureTitleField
            inputKey={metric.id}
            value={metric.title}
            onChange={(title) => onChange({ ...metric, title })}
          />
        </div>
        <GoalMetricReadout metric={metric} track={track} showWeight={false} />
        <div className={metricsClassName}>
          <GoalWeightInput
            weight={metric.weight}
            ariaLabel={weightLabel}
            onChange={(weight) => onChange({ ...metric, weight })}
          />
        </div>
      </div>

      {meta ? <div className="pd-goal-measure-card__meta">{meta}</div> : null}

      <div className="pd-goal-measure-card__body">
        <div className="pd-goal-measure-card__list pd-goal-measure-card__list--number">
          <div className="pd-goal-measure-card__list-head">
            <span className="pd-goal-measure-card__list-label">Set target</span>
            <label className="pd-goal-measure-card__list-unit">
              <span className="pd-sr-only">Metric unit</span>
              <ListboxSelect
                value={metric.unit}
                aria-label="Metric unit"
                allowEmpty={false}
                options={METRIC_UNITS.map((unit) => ({
                  value: unit.value,
                  label: unit.label,
                }))}
                onValueChange={(next) =>
                  onChange({ ...metric, unit: next as MetricUnit })
                }
              />
            </label>
          </div>
          <div className="pd-goal-measure-card__list-body">
            <NumberTargetEditor
              metric={metric}
              onChange={onChange}
              showHeading={false}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
