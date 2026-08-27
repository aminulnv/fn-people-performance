import { useEffect, useState } from 'react'
import { Button, ConfirmDialog, Input } from '@/components/ui'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from './ReviewSaveBanner'
import { parseDateTime } from '@/lib/dates/timestamp'
import { toUtcIso } from '@/lib/dates/timezone'
import { cycleHasReviews } from '@/lib/reviews/groupSummary'
import { releaseReviewCycle } from '@/lib/reviews/packetsApi'
import { applyNestedWindowsToReviewStages } from '@/lib/reviews/reviewStages'
import { updateReviewCycle } from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'

type ReleaseTarget = 'managers' | 'employees'
type PublishField = 'toManager' | 'toAll'

const CONFIRM: Record<
  ReleaseTarget,
  { title: string; description: string; confirmLabel: string }
> = {
  managers: {
    title: 'Release to managers now?',
    description:
      'Line managers will see the final grade immediately for everyone in this cycle who already has a manager grade. This does not wait for the scheduled time.',
    confirmLabel: 'Release now',
  },
  employees: {
    title: 'Release to employees now?',
    description:
      'People will see their final grade immediately if they already have a manager grade in this cycle. This does not wait for the scheduled time.',
    confirmLabel: 'Release now',
  },
}

const AUDIENCES: {
  target: ReleaseTarget
  field: PublishField
  step: string
  title: string
  description: string
  dateLabel: string
  releaseLabel: string
}[] = [
  {
    target: 'managers',
    field: 'toManager',
    step: '1',
    title: 'Managers',
    description: 'Line managers see the final grade first.',
    dateLabel: 'Managers visible from',
    releaseLabel: 'Release to managers now',
  },
  {
    target: 'employees',
    field: 'toAll',
    step: '2',
    title: 'Employees',
    description: 'People see their own final grade after managers.',
    dateLabel: 'Employees visible from',
    releaseLabel: 'Release to employees now',
  },
]

type CyclePublishSectionProps = {
  cycle: ReviewCycle
}

export function CyclePublishSection({ cycle }: CyclePublishSectionProps) {
  const [pending, setPending] = useState<ReleaseTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null)
  const [managerDate, setManagerDate] = useState(() =>
    toUtcIso(cycle.stagesConfig.publish.toManager),
  )
  const [employeeDate, setEmployeeDate] = useState(() =>
    toUtcIso(cycle.stagesConfig.publish.toAll),
  )

  useEffect(() => {
    setManagerDate(toUtcIso(cycle.stagesConfig.publish.toManager))
    setEmployeeDate(toUtcIso(cycle.stagesConfig.publish.toAll))
  }, [
    cycle.id,
    cycle.stagesConfig.publish.toAll.date,
    cycle.stagesConfig.publish.toAll.time,
    cycle.stagesConfig.publish.toManager.date,
    cycle.stagesConfig.publish.toManager.time,
  ])

  if (!cycleHasReviews(cycle)) return null

  const confirm = pending ? CONFIRM[pending] : null
  const dates: Record<PublishField, string> = {
    toManager: managerDate,
    toAll: employeeDate,
  }

  const savePublishDate = (field: PublishField, date: string) => {
    if (field === 'toManager') setManagerDate(date)
    else setEmployeeDate(date)
    const current =
      field === 'toManager'
        ? cycle.stagesConfig.publish.toManager
        : cycle.stagesConfig.publish.toAll
    const parsed = parseDateTime(date)
    const stagesConfig = applyNestedWindowsToReviewStages({
      ...cycle.stagesConfig,
      publish: {
        ...cycle.stagesConfig.publish,
        [field]: parsed ?? { ...current, date },
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
      .then(() => {
        setToastNotice(
          successNotice(
            target === 'managers'
              ? 'Released to managers.'
              : 'Released to employees.',
          ),
        )
      })
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
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />

      <header className="pd-reviews-settings__section-head">
        <div>
          <h3
            className="pd-reviews-settings__section-title"
            id="cycle-publish-heading"
          >
            Publish results
          </h3>
          <p className="pd-reviews-settings__section-lede">
            Managers see the final grade first, then employees. Set when each
            group can see grades, or release now if you need to go earlier.
          </p>
        </div>
      </header>

      <ol className="pd-cycle-setup__publish-audiences">
        {AUDIENCES.map((audience) => (
          <li key={audience.target}>
            <article
              className="pd-cycle-setup__publish-audience"
              aria-labelledby={`cycle-publish-${audience.target}-heading`}
            >
              <header className="pd-cycle-setup__publish-audience-head">
                <span className="pd-cycle-setup__publish-index" aria-hidden>
                  {audience.step}
                </span>
                <div>
                  <h4
                    className="pd-cycle-setup__publish-audience-title"
                    id={`cycle-publish-${audience.target}-heading`}
                  >
                    {audience.title}
                  </h4>
                  <p className="pd-cycle-setup__publish-audience-lede">
                    {audience.description}
                  </p>
                </div>
              </header>
              <div className="pd-cycle-setup__publish-audience-body">
                <Input
                  label="Visible from"
                  type="datetime"
                  aria-label={audience.dateLabel}
                  value={dates[audience.field]}
                  onChange={(event) =>
                    savePublishDate(audience.field, event.target.value)
                  }
                />
                <div className="pd-cycle-setup__publish-now">
                  <p className="pd-cycle-setup__publish-now-label">
                    Need it sooner?
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    pill
                    disabled={busy}
                    aria-label={audience.releaseLabel}
                    onClick={() => {
                      setError(null)
                      setPending(audience.target)
                    }}
                  >
                    Release now
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>

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
        confirmLabel={confirm?.confirmLabel ?? 'Release now'}
        cancelLabel="Cancel"
      />
    </section>
  )
}
