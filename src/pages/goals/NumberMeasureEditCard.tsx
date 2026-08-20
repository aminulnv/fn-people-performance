import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { ListboxSelect } from '@/components/ui'
import { METRIC_UNITS } from '@/lib/goals/measurements'
import type { Metric, MetricUnit } from '@/lib/goals/types'
import {
  GoalMetricReadout,
  GoalWeightInput,
} from '@/pages/goals/GoalMeasurementReadout'
import { GoalProgressLog } from '@/pages/goals/GoalProgressLog'
import { MeasureTitleField } from '@/pages/goals/MeasureTitleField'
import { MeasureTypeIcon } from '@/pages/goals/MeasureTypeSwitch'
import { MetricProgressUpdate } from '@/pages/goals/MetricProgressUpdate'
import { NumberTargetEditor } from '@/pages/goals/NumberTargetEditor'

export function NumberMeasureEditCard({
  metric,
  onChange,
  onRemove,
  onLogProgress,
  cycleLabel,
  goalTitle,
  meta,
  cardClassName = 'pd-goal-view__card pd-goal-measure-card pd-goal-measure-card--edit',
  headClassName = 'pd-goal-view__card-head',
  titleClassName = 'pd-goal-view__card-title',
  metricsClassName = 'pd-goal-view__card-metrics',
}: {
  metric: Metric
  onChange: (next: Metric) => void
  onRemove?: () => void
  onLogProgress?: (nextValue: number | undefined) => void
  cycleLabel?: string
  goalTitle?: string
  meta?: ReactNode
  cardClassName?: string
  headClassName?: string
  titleClassName?: string
  metricsClassName?: string
}) {
  const trimmedTitle = metric.title.trim()
  const weightLabel = trimmedTitle ? `Weight for ${trimmedTitle}` : 'Weight'

  return (
    <section className={cardClassName} aria-label={trimmedTitle || 'Measure'}>
      <div className={headClassName}>
        <div className={titleClassName}>
          <MeasureTypeIcon kind="number" />
          <MeasureTitleField
            inputKey={metric.id}
            value={metric.title}
            onChange={(title) => onChange({ ...metric, title })}
          />
        </div>
        <div className={metricsClassName}>
          <GoalMetricReadout metric={metric} showWeight={false} />
          <GoalWeightInput
            weight={metric.weight}
            ariaLabel={weightLabel}
            onChange={(weight) => onChange({ ...metric, weight })}
          />
          {onRemove ? (
            <button
              type="button"
              className="pd-goal-create__icon-btn pd-goal-create__icon-btn--danger"
              aria-label={`Remove ${trimmedTitle || 'number measure'}`}
              onClick={onRemove}
            >
              <Trash2 size={15} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
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
        {onLogProgress ? (
          <div className="pd-goal-measure-card__list pd-goal-measure-card__list--number">
            <MetricProgressUpdate
              metric={metric}
              goalTitle={goalTitle}
              cycleLabel={cycleLabel}
              onCommit={onLogProgress}
            />
            <GoalProgressLog entries={metric.progressLog ?? []} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
