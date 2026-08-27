import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { Metric } from '@/lib/goals/types'
import {
  ReviewSaveBanner,
  type ReviewSaveNotice,
} from '@/pages/reviews/ReviewSaveBanner'
import { metricTipFromMetric } from './goalHelpers'

export function sanitizeMetricDraft(raw: string): string {
  const minus = raw.startsWith('-') ? '-' : ''
  const rest = (minus ? raw.slice(1) : raw).replace(/[^\d.]/g, '')
  const dot = rest.indexOf('.')
  if (dot === -1) return minus + rest
  return minus + rest.slice(0, dot + 1) + rest.slice(dot + 1).replace(/\./g, '')
}

function parsedCurrent(raw: string) {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return undefined
  }
  const next = Number(trimmed)
  return Number.isFinite(next) ? next : undefined
}

export function MetricProgressUpdate({
  metric,
  goalTitle,
  cycleLabel,
  autoFocus = false,
  compact = false,
  disabled = false,
  onCommit,
}: {
  metric: Metric
  goalTitle?: string
  cycleLabel?: string
  autoFocus?: boolean
  compact?: boolean
  disabled?: boolean
  onCommit: (nextValue: number | undefined) => void
}) {
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<ReviewSaveNotice | null>(null)
  const name = metric.title.trim() || goalTitle?.trim() || 'metric'
  const tip = metricTipFromMetric(metric)
  const lastValue = `${tip.initial} → ${tip.current} → ${tip.target}`

  useEffect(() => {
    setDraft('')
  }, [metric.id, metric.currentValue])

  useEffect(() => {
    setNotice(null)
  }, [metric.id])

  const save = () => {
    const next = parsedCurrent(draft)
    if (next == null) return
    onCommit(next)
    setDraft('')
    setNotice({
      variant: 'success',
      message: 'Progress updated.',
      shownAt: Date.now(),
    })
  }

  return (
    <div className={cx('pd-goal-log-update', compact && 'pd-goal-log-update--compact')}>
      {compact ? null : (
        <p className="pd-goal-log-update__label">Log update</p>
      )}
      <div className="pd-goal-log-update__row">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus && !disabled}
          disabled={disabled}
          value={draft}
          placeholder="Current value"
          aria-label={`Current progress for ${name}`}
          onChange={(event) => setDraft(sanitizeMetricDraft(event.target.value))}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            save()
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size={compact ? 'sm' : 'md'}
          pill
          aria-label={`Add Update For ${name}`}
          disabled={disabled || parsedCurrent(draft) == null}
          onClick={save}
        >
          Add
        </Button>
      </div>
      <ReviewSaveBanner notice={notice} onDismiss={() => setNotice(null)} />
      <p className="pd-sr-only" aria-label={`Last value ${lastValue}`}>
        Last value: {lastValue}
        {cycleLabel ? ` · ${cycleLabel}` : ''}
      </p>
    </div>
  )
}
