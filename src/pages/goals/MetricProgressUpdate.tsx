import { useEffect, useId, useRef, useState } from 'react'
import { ListPlus, Target, X } from 'lucide-react'
import { Badge, Button, Modal } from '@/components/ui'
import type { Metric } from '@/lib/goals/types'
import { metricTipFromMetric } from './goalHelpers'

function draftFromMetric(metric: Metric) {
  return metric.currentValue == null ? '' : String(metric.currentValue)
}

function parsedCurrent(raw: string) {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  const next = Number(trimmed)
  return Number.isFinite(next) ? next : undefined
}

export function MetricProgressUpdate({
  metric,
  goalTitle,
  cycleLabel,
  onCommit,
}: {
  metric: Metric
  goalTitle?: string
  cycleLabel?: string
  onCommit: (nextValue: number | undefined) => void
}) {
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => draftFromMetric(metric))
  const name = metric.title.trim() || goalTitle?.trim() || 'metric'
  const tip = metricTipFromMetric(metric)
  const lastValue = `${tip.initial} → ${tip.current} → ${tip.target}`

  useEffect(() => {
    setDraft(draftFromMetric(metric))
  }, [metric.id, metric.currentValue, open])

  const close = () => {
    setDraft(draftFromMetric(metric))
    setOpen(false)
  }

  const save = () => {
    onCommit(parsedCurrent(draft))
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="pd-goal-progress-update__open"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Log update for ${name}`}
        onClick={() => setOpen(true)}
      >
        <ListPlus size={14} strokeWidth={2.25} aria-hidden />
        Log update
      </Button>
      {open ? (
        <Modal
          open={open}
          onClose={close}
          title="Update progress"
          className="pd-goal-progress-modal"
          initialFocusRef={inputRef}
          actions={
            <>
              <Button variant="secondary" pill onClick={close}>
                Cancel
              </Button>
              <Button variant="primary" pill onClick={save}>
                Update values
              </Button>
            </>
          }
        >
          <div className="pd-goal-progress-modal__header">
            <button
              type="button"
              className="pd-goal-progress-modal__close"
              aria-label="Close"
              onClick={close}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
            <p className="pd-goal-progress-modal__heading" aria-hidden>
              Update progress
            </p>
            {cycleLabel ? (
              <Badge
                variant="in-progress"
                className="pd-goal-progress-modal__cycle"
              >
                {cycleLabel}
              </Badge>
            ) : (
              <span className="pd-goal-progress-modal__cycle" aria-hidden />
            )}
          </div>
          <p className="pd-goal-progress-modal__subject">
            <Target size={14} strokeWidth={2.25} aria-hidden />
            <span>{name}</span>
          </p>
          <p className="pd-goal-progress-modal__last">
            Last value:{' '}
            <span aria-label={`Last value ${lastValue}`}>{lastValue}</span>
          </p>
          <label className="pd-goal-progress-modal__field" htmlFor={fieldId}>
            <span>Current progress</span>
            <span className="pd-goal-progress-modal__control">
              <input
                ref={inputRef}
                id={fieldId}
                type="number"
                value={draft}
                aria-label={`Current progress for ${name}`}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  save()
                }}
              />
              <span>{tip.unit}</span>
            </span>
          </label>
        </Modal>
      ) : null}
    </>
  )
}
