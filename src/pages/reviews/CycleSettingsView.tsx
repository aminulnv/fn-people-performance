import { useState } from 'react'
import { Button, Card } from '@/components/ui'
import {
  CALIBRATION_MODE_META,
  enabledReviewTypeLabels,
  formatDistribution,
  GRADE_RECOMMENDATION_META,
  stagesConfigToTimeline,
} from '@/lib/reviews/labels'
import { formatDateRange } from '@/lib/reviews/periods'
import type { ReviewCycle } from '@/lib/reviews/types'
import { CalibrationEditPage } from './CalibrationEditPage'
import { CycleStagesTimeline } from './CycleStagesTimeline'
import { exclusionsLabel } from './GradePublishingExclusionsDrawer'
import { SettingsEditPage } from './SettingsEditPage'
import { StagesEditPage } from './StagesEditPage'

type CycleSettingsViewProps = {
  cycle: ReviewCycle
  onEditingChange?: (editing: boolean) => void
}

type EditTarget = 'stages' | 'settings' | 'calibration' | null

export function CycleSettingsView({
  cycle,
  onEditingChange,
}: CycleSettingsViewProps) {
  const [editing, setEditing] = useState<EditTarget>(null)

  const openEdit = (target: EditTarget) => {
    setEditing(target)
    onEditingChange?.(target !== null)
  }

  const closeEdit = () => {
    setEditing(null)
    onEditingChange?.(false)
  }

  if (editing === 'stages') {
    return <StagesEditPage cycle={cycle} onClose={closeEdit} />
  }
  if (editing === 'settings') {
    return <SettingsEditPage cycle={cycle} onClose={closeEdit} />
  }
  if (editing === 'calibration') {
    return <CalibrationEditPage cycle={cycle} onClose={closeEdit} />
  }

  const timeline = stagesConfigToTimeline(cycle.stagesConfig)

  return (
    <div className="pd-reviews-settings">
      <Card
        className="pd-reviews-settings__card"
        title="Cycle stages"
        description="Manage cycle stages"
        actions={
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => openEdit('stages')}
          >
            Edit
          </Button>
        }
      >
        <CycleStagesTimeline stages={timeline} />
      </Card>

      <Card
        className="pd-reviews-settings__card"
        title="Cycle Settings"
        actions={
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => openEdit('settings')}
          >
            Edit
          </Button>
        }
      >
        <dl className="pd-reviews-kv">
          <div className="pd-reviews-kv__row">
            <dt>Cycle name</dt>
            <dd>{cycle.name}</dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Cycle timeframe</dt>
            <dd>{formatDateRange(cycle.startDate, cycle.endDate)}</dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Review types</dt>
            <dd>{enabledReviewTypeLabels(cycle.settings)}</dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Grade publishing exclusion</dt>
            <dd>
              {exclusionsLabel(cycle.settings.excludedEmployeeIds?.length ?? 0)}
            </dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Auto scorecard generation</dt>
            <dd>
              {cycle.settings.autoScorecardGeneration ? 'Enabled' : 'Disabled'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        className="pd-reviews-settings__card"
        title="Calculation & Calibration logic"
        actions={
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => openEdit('calibration')}
          >
            Edit
          </Button>
        }
      >
        <dl className="pd-reviews-kv">
          <div className="pd-reviews-kv__row">
            <dt>Calibration mode</dt>
            <dd>
              {CALIBRATION_MODE_META[cycle.calibration.calibrationMode].label}
            </dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Grade recommendation logic</dt>
            <dd>
              {
                GRADE_RECOMMENDATION_META[cycle.calibration.gradeRecommendation]
                  .label
              }
            </dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Calibration grade distribution</dt>
            <dd>{formatDistribution(cycle.calibration.gradeDistribution)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
