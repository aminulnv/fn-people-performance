import type { MouseEvent, ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Progress, Tooltip } from '@/components/ui'
import {
  measurementPanels,
  type MeasurementPanel,
} from '@/lib/goals/measurements'
import type { Goal } from '@/lib/goals/types'
import { goalCompletion } from '@/lib/goals/weightage'
import { GoalMeasureGlance } from '@/pages/goals/GoalMeasurementReadout'
import {
  GoalProgressLog,
  ProgressLogHeading,
} from '@/pages/goals/GoalProgressLog'
import { MeasureKindIcon } from '@/pages/goals/MeasureKindIcon'
import {
  measurePanelName,
  measurePanelProgress,
  measurePanelProgressLog,
  measurePanelTableWeight,
} from '@/pages/goals/measurePanelDisplay'

function keepRowClickFromOpening(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation()
  event.preventDefault()
}

function GoalMetricsSummary({ goal }: { goal: Goal }) {
  const panels = measurementPanels(goal.measurements)
  const completion = Math.round(goalCompletion(goal))
  const title = goal.description.trim() || 'Goal'
  const metricLabel =
    panels.length === 1 ? '1 metric' : `${panels.length} metrics`

  return (
    <div className="pd-okr-ref__detail pd-goals-progress-summary">
      <header className="pd-okr-ref__detail-head">
        <p className="pd-okr-ref__detail-kind">Goal summary</p>
        <h3>{title}</h3>
      </header>
      <div className="pd-okr-ref__detail-score pd-goals-progress-summary__score">
        <Progress value={completion} showValue label="Overall progress" />
        <p className="pd-okr-ref__detail-score-gap">{metricLabel}</p>
      </div>
      {panels.length > 0 ? (
        <ul className="pd-goals-progress-summary__metrics">
          {panels.map((panel) => {
            const name = measurePanelName(panel) || 'Untitled metric'
            const progress = measurePanelProgress(panel)
            const weight = measurePanelTableWeight(panel, panels.length)
            const entries = measurePanelProgressLog(panel)
            const kind = panel.kind === 'metric' ? 'metric' : 'milestone'
            return (
              <li key={panel.key} className="pd-goals-progress-summary__metric">
                <div className="pd-goals-progress-summary__metric-head">
                  <MeasureKindIcon
                    kind={panel.kind === 'metric' ? 'metric' : 'milestone'}
                  />
                  <span className="pd-goals-progress-summary__metric-name">
                    {name}
                  </span>
                  <span className="pd-goals-progress-summary__metric-weight">
                    {weight}%
                  </span>
                  <span className="pd-goals-progress-summary__metric-pct">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} />
                {entries.length > 0 ? (
                  <GoalProgressLog
                    kind={kind}
                    entries={entries}
                    className="pd-goals-progress-summary__metric-log"
                    label={`Progress updates for ${name}`}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p>No metrics yet</p>
      )}
    </div>
  )
}

function ProgressHistory({
  panels,
  kind,
}: {
  panels: MeasurementPanel[]
  kind?: 'metric' | 'milestone'
}) {
  const entries = panels.flatMap(measurePanelProgressLog)
  return (
    <section className="pd-goals-progress-info__history">
      <ProgressLogHeading count={entries.length} />
      {entries.length > 0 ? (
        <GoalProgressLog
          variant="list"
          kind={kind}
          entries={entries}
          label="Update history"
        />
      ) : (
        <p>No updates yet</p>
      )}
    </section>
  )
}

export function GoalProgressInfoTip({
  panel,
  goal,
}: {
  panel?: MeasurementPanel
  goal?: Goal
}) {
  if (panel) {
    return (
      <div className="pd-goals-progress-info">
        <GoalMeasureGlance panel={panel} />
        <ProgressHistory
          panels={[panel]}
          kind={panel.kind === 'metric' ? 'metric' : 'milestone'}
        />
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="pd-goals-progress-info">
        <p>No metrics yet</p>
      </div>
    )
  }

  return (
    <div className="pd-goals-progress-info">
      <GoalMetricsSummary goal={goal} />
    </div>
  )
}

export function GoalProgressInfo({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip
      className="pd-goals-progress-info-tip"
      content={children}
      side="left"
      portal
      interactive
      delayMs={80}
    >
      <button
        type="button"
        className="pd-goals-progress-info__trigger"
        aria-label={label}
        onClick={keepRowClickFromOpening}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Info size={12} strokeWidth={2} aria-hidden />
      </button>
    </Tooltip>
  )
}
