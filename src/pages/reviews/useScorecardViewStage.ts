import { useSearchParams } from 'react-router-dom'
import {
  currentScorecardStepIndex,
  parseScorecardViewStage,
  resolveScorecardViewStage,
  scorecardStageIsOpen,
  visibleScorecardStepsForViewer,
  type ScorecardViewStage,
} from '@/lib/reviews/scorecardStages'
import type { ReviewPacket, ReviewStageConfig } from '@/lib/reviews/types'

export function useScorecardViewStage(input: {
  packet: ReviewPacket | null
  stages?: ReviewStageConfig[]
  viewerEmployeeId?: number | null
  /** Route subject — used for least-privilege tabs before the packet loads. */
  subjectEmployeeId?: number | null
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const steps = visibleScorecardStepsForViewer(
    input.stages,
    input.packet,
    input.viewerEmployeeId,
    input.subjectEmployeeId,
  )
  const currentIndex = currentScorecardStepIndex(
    steps,
    input.packet?.status ?? 'not_started',
  )
  const viewing = resolveScorecardViewStage({
    requested: parseScorecardViewStage(searchParams.get('stage')),
    steps,
    packet: input.packet,
    viewerEmployeeId: input.viewerEmployeeId,
    subjectEmployeeId: input.subjectEmployeeId,
  })

  const selectStage = (stage: ScorecardViewStage) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('stage', stage)
        return next
      },
      { replace: true },
    )
  }

  const isOpen = (stage: ScorecardViewStage) => {
    const index = steps.findIndex((step) => step.id === stage)
    if (index < 0) return false
    return scorecardStageIsOpen(
      steps[index],
      index,
      currentIndex,
      input.packet,
      input.viewerEmployeeId,
      input.subjectEmployeeId,
    )
  }

  return { steps, currentIndex, viewing, selectStage, isOpen }
}
