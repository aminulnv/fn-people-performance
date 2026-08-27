import { useState } from 'react'
import { Button, ConfirmDialog, Input } from '@/components/ui'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from './ReviewSaveBanner'
import { releaseReviewGroup } from '@/lib/reviews/packetsApi'

type ReleaseTarget = 'managers' | 'employees'

const CONFIRM: Record<
  ReleaseTarget,
  { title: string; description: string }
> = {
  managers: {
    title: 'Release to managers now?',
    description:
      'Line managers will see the final grade immediately for everyone in this group who already has a manager grade. This does not wait for the scheduled time.',
  },
  employees: {
    title: 'Release to employees now?',
    description:
      'People will see their final grade immediately if they already have a manager grade in this group. This does not wait for the scheduled time.',
  },
}

type PublishStageControlsProps = {
  cycleId: string
  groupId: string
  target: ReleaseTarget
  date: string
  dateLabel: string
  releaseLabel: string
  onDateChange: (date: string) => void
}

export function PublishStageControls({
  cycleId,
  groupId,
  target,
  date,
  dateLabel,
  releaseLabel,
  onDateChange,
}: PublishStageControlsProps) {
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null)
  const confirm = CONFIRM[target]

  const runRelease = () => {
    setBusy(true)
    setError(null)
    void releaseReviewGroup(cycleId, groupId, target)
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
    <div className="pd-reviews-publish">
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />
      <Input
        label="Visible from"
        type="datetime"
        aria-label={dateLabel}
        value={date}
        onChange={(event) => onDateChange(event.target.value)}
      />
      <div className="pd-reviews-publish__now">
        <p className="pd-reviews-publish__now-label">Need it sooner?</p>
        <Button
          variant="secondary"
          size="sm"
          pill
          disabled={busy}
          aria-label={releaseLabel}
          onClick={() => {
            setError(null)
            setPending(true)
          }}
        >
          Release now
        </Button>
      </div>
      {error ? (
        <p className="pd-reviews-modal__error" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={pending}
        onClose={() => {
          if (!busy) setPending(false)
        }}
        onConfirm={() => {
          if (busy) return
          setPending(false)
          runRelease()
        }}
        title={confirm.title}
        description={confirm.description}
        confirmLabel="Release now"
        cancelLabel="Cancel"
      />
    </div>
  )
}
