import { useMemo } from 'react'
import {
  ClipboardList,
  Gavel,
  Megaphone,
  User,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
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

const STAGE_ICONS: Record<ScorecardViewStage, LucideIcon> = {
  self_review: User,
  manager_review: UserCheck,
  calibration_hod_hrbp: ClipboardList,
  publish_employees: Megaphone,
  appeal: Gavel,
}

export function ScorecardStageNav({
  packet,
  stages,
  viewerEmployeeId,
  subjectEmployeeId,
  viewing,
  onViewStage,
}: {
  packet: ReviewPacket | null
  stages?: ReviewStageConfig[]
  viewerEmployeeId?: number | null
  subjectEmployeeId?: number | null
  viewing: ScorecardViewStage
  onViewStage: (stage: ScorecardViewStage) => void
}) {
  const steps = visibleScorecardStepsForViewer(
    stages,
    packet,
    viewerEmployeeId,
    subjectEmployeeId,
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
          subjectEmployeeId,
        )
        const label = scorecardStepLabel(step.id)
        const Icon = STAGE_ICONS[step.id]
        return {
          id: step.id,
          label: (
            <>
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              {label}
            </>
          ),
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
    [currentIndex, packet, steps, subjectEmployeeId, viewerEmployeeId],
  )

  if (steps.length <= 1) return null

  return (
    <nav
      className="pd-reviews-scorecard__stage-nav"
      aria-label={`Review stages, viewing ${scorecardStepLabel(viewing)}`}
    >
      <SegmentedControl
        className="pd-profile__tabs pd-reviews-scorecard__stage-segmented"
        buttonClassName="pd-profile__tab"
        aria-label="Review stages"
        options={options}
        value={viewing}
        onChange={onViewStage}
      />
    </nav>
  )
}
