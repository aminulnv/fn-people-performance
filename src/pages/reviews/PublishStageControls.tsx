import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button, ConfirmDialog, Input } from '@/components/ui'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from './ReviewSaveBanner'
import { releaseReviewGroup } from '@/lib/reviews/packetsApi'
import {
  exclusionsLabel,
  GradePublishingExclusionsDrawer,
} from './GradePublishingExclusionsDrawer'

type ReleaseTarget = 'managers' | 'employees'

const CONFIRM: Record<
  ReleaseTarget,
  { title: string; description: string }
> = {
  managers: {
    title: 'Publish to Managers First Now?',
    description:
      'Line managers will see the official grade immediately for everyone in this group who already has a manager grade. Employees still cannot see their result. This does not wait for the scheduled time.',
  },
  employees: {
    title: 'Publish to Everyone Now?',
    description:
      'People will see their official grade immediately if they already have a manager grade in this group. This does not wait for the scheduled time.',
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
  cycleName?: string
  excludedEmployeeIds?: number[]
  onExcludedEmployeeIdsChange?: (ids: number[]) => void
}

export function PublishStageControls({
  cycleId,
  groupId,
  target,
  date,
  dateLabel,
  releaseLabel,
  onDateChange,
  cycleName = '',
  excludedEmployeeIds = [],
  onExcludedEmployeeIdsChange,
}: PublishStageControlsProps) {
  const [pending, setPending] = useState(false)
  const [exceptionsOpen, setExceptionsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null)
  const confirm = CONFIRM[target]
  const confirmationDescription =
    target === 'employees' && excludedEmployeeIds.length > 0
      ? `${confirm.description} ${exclusionsLabel(excludedEmployeeIds.length)} from automatic publication.`
      : confirm.description
  const hasExceptions = excludedEmployeeIds.length > 0

  const runRelease = () => {
    setBusy(true)
    setError(null)
    void releaseReviewGroup(cycleId, groupId, target)
      .then(() => {
        setToastNotice(
          successNotice(
            target === 'managers'
              ? 'Final grades are now visible to managers.'
              : 'Review published.',
          ),
        )
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : target === 'managers'
              ? 'Could not show final grades to managers.'
              : 'Could not publish the review.',
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
      <div className="pd-reviews-publish__schedule">
        <div className="pd-reviews-window__date">
          <span className="pd-reviews-window__label">Goes live</span>
          <Input
            type="datetime"
            aria-label={dateLabel}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          pill
          className="pd-reviews-publish__now-btn"
          disabled={busy}
          aria-label={releaseLabel}
          onClick={() => {
            setError(null)
            setPending(true)
          }}
        >
          <Send size={14} strokeWidth={2} aria-hidden />
          Publish now
        </Button>
      </div>
      {target === 'employees' && onExcludedEmployeeIdsChange ? (
        <div className="pd-reviews-publish__exceptions">
          <div className="pd-reviews-publish__exceptions-copy">
            <p className="pd-reviews-publish__exceptions-label">Exceptions</p>
            <p className="pd-reviews-publish__exceptions-value">
              {hasExceptions
                ? exclusionsLabel(excludedEmployeeIds.length)
                : 'Everyone in this group is included'}
            </p>
          </div>
          <button
            type="button"
            className="pd-reviews-edit-link"
            onClick={() => setExceptionsOpen(true)}
          >
            {hasExceptions ? 'Edit' : 'Exclude people'}
          </button>
        </div>
      ) : null}
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
        description={confirmationDescription}
        confirmLabel="Publish Now"
        cancelLabel="Cancel"
      />
      {target === 'employees' && onExcludedEmployeeIdsChange ? (
        <GradePublishingExclusionsDrawer
          open={exceptionsOpen}
          cycleName={cycleName}
          selectedIds={excludedEmployeeIds}
          onChange={onExcludedEmployeeIdsChange}
          onClose={() => setExceptionsOpen(false)}
        />
      ) : null}
    </div>
  )
}
