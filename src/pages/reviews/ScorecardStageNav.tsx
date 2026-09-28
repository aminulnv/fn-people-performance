import { useMemo } from 'react'
import { SegmentedControl } from '@/components/ui'
import {
  currentScorecardStepIndex,
  flowStepState,
  scorecardStageIsOpen,
  scorecardStepLabel,
  visibleScorecardStepsForViewer,
  type ScorecardViewStage,
} from '@/lib/reviews/scorecardStages'
import type {
  ReviewPacket,
  ReviewStageConfig,
} from '@/lib/reviews/types'

export function ScorecardStageNav({
  packet,
  stages,
  viewerEmployeeId,
  viewing,
  onViewStage,
}: {
  packet: ReviewPacket | null
  stages?: ReviewStageConfig[]
  viewerEmployeeId?: number | null
  viewing: ScorecardViewStage
  onViewStage: (stage: ScorecardViewStage) => void
}) {
  const steps = visibleScorecardStepsForViewer(
    stages,
    packet,
    viewerEmployeeId,
  )
  const currentIndex = currentScorecardStepIndex(
    steps,
    packet?.status ?? 'not_started',
  )

  const options = useMemo(
    () =>
      steps.map((step, index) => {
        const state = flowStepState(
          step,
          index,
          currentIndex,
          packet?.status ?? 'not_started',
        )
        const open = scorecardStageIsOpen(
          step,
          index,
          currentIndex,
          packet,
          viewerEmployeeId,
        )
        const label = scorecardStepLabel(step.id)
        return {
          id: step.id,
          label,
          disabled: !open,
          title: open
            ? undefined
            : state === 'active'
              ? `${label} is in progress`
              : state === 'upcoming'
                ? `${label} is not open yet`
                : undefined,
        }
      }),
    [currentIndex, packet, steps, viewerEmployeeId],
  )

  if (steps.length <= 1) return null

  return (
    <nav
      className="pd-reviews-scorecard__stage-nav"
      aria-label={`Review stages, viewing ${scorecardStepLabel(viewing)}`}
    >
      <SegmentedControl
        className="pd-reviews-scorecard__stage-segmented"
        aria-label="Review stages"
        options={options}
        value={viewing}
        onChange={onViewStage}
      />
    </nav>
  )
}
