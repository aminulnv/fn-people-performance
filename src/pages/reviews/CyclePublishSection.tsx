import { useEffect, useState } from 'react'
import { Button, ConfirmDialog, Input } from '@/components/ui'
import { cycleHasReviews } from '@/lib/reviews/groupSummary'
import { releaseReviewCycle } from '@/lib/reviews/packetsApi'
import { applyNestedWindowsToReviewStages } from '@/lib/reviews/reviewStages'
import { updateReviewCycle } from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'

type ReleaseTarget = 'managers' | 'employees'

const CONFIRM: Record<
  ReleaseTarget,
  { title: string; description: string; confirmLabel: string }
> = {
  managers: {
    title: 'Release to managers?',
    description:
      'Line managers will see the final grade for everyone in this cycle who already has a manager grade.',
    confirmLabel: 'Release to managers',
  },
  employees: {
    title: 'Release to employees?',
    description:
      'People will see their final grade if they already have a manager grade in this cycle.',
    confirmLabel: 'Release to employees',
  },
}

type CyclePublishSectionProps = {
  cycle: ReviewCycle
}

export function CyclePublishSection({ cycle }: CyclePublishSectionProps) {
  const [pending, setPending] = useState<ReleaseTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerDate, setManagerDate] = useState(
    cycle.stagesConfig.publish.toManager.date,
  )
  const [employeeDate, setEmployeeDate] = useState(
    cycle.stagesConfig.publish.toAll.date,
  )

  useEffect(() => {
    setManagerDate(cycle.stagesConfig.publish.toManager.date)
    setEmployeeDate(cycle.stagesConfig.publish.toAll.date)
  }, [
    cycle.id,
    cycle.stagesConfig.publish.toAll.date,
    cycle.stagesConfig.publish.toManager.date,
  ])

  if (!cycleHasReviews(cycle)) return null

  const confirm = pending ? CONFIRM[pending] : null

  const savePublishDate = (
    field: 'toManager' | 'toAll',
    date: string,
  ) => {
    if (field === 'toManager') setManagerDate(date)
    else setEmployeeDate(date)
    const current = field === 'toManager' ? cycle.stagesConfig.publish.toManager : cycle.stagesConfig.publish.toAll
    const stagesConfig = applyNestedWindowsToReviewStages({
      ...cycle.stagesConfig,
      publish: {
        ...cycle.stagesConfig.publish,
        [field]: { ...current, date },
      },
    })
    try {
      void updateReviewCycle(cycle.id, { stagesConfig }).catch(() => {})
    } catch {
      /* Keep the date when the cycle is not in the store. */
    }
  }

  const runRelease = (target: ReleaseTarget) => {
    setBusy(true)
    setError(null)
    void releaseReviewCycle(cycle.id, target)
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : target === 'managers'
              ? 'Could not release to managers.'
              : 'Could not release to employees.',
        )
      })
      .finally(() => {
        setBusy(false)
      })
  }

  return (
    <section
      className="pd-reviews-settings__section"
      aria-labelledby="cycle-publish-heading"
    >
      <div className="pd-reviews-settings__section-head">
        <div>
          <h3
            className="pd-reviews-settings__section-title"
            id="cycle-publish-heading"
          >
            Publish results
          </h3>
          <p className="pd-reviews-settings__section-lede">
            Set the day grades become visible. Release now if you need to go
            earlier. Managers see the final grade first, then employees.
          </p>
        </div>
      </div>

      <div className="pd-cycle-setup__publish-actions">
        <div className="pd-cycle-setup__publish-row">
          <Input
            label="On"
            type="date"
            aria-label="Release to managers on"
            value={managerDate}
            onChange={(event) =>
              savePublishDate('toManager', event.target.value)
            }
          />
          <Button
            variant="secondary"
            size="sm"
            pill
            disabled={busy}
            onClick={() => {
              setError(null)
              setPending('managers')
            }}
          >
            Release to managers
          </Button>
        </div>
        <div className="pd-cycle-setup__publish-row">
          <Input
            label="On"
            type="date"
            aria-label="Release to employees on"
            value={employeeDate}
            onChange={(event) => savePublishDate('toAll', event.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            pill
            disabled={busy}
            onClick={() => {
              setError(null)
              setPending('employees')
            }}
          >
            Release to employees
          </Button>
        </div>
      </div>

      {error ? (
        <p className="pd-reviews-modal__error" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => {
          if (!busy) setPending(null)
        }}
        onConfirm={() => {
          if (!pending || busy) return
          const target = pending
          setPending(null)
          runRelease(target)
        }}
        title={confirm?.title ?? ''}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? 'Release'}
        cancelLabel="Cancel"
      />
    </section>
  )
}
