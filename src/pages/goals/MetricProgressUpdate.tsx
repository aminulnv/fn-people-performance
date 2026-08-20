import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui'
import type { Metric } from '@/lib/goals/types'
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
  onCommit,
}: {
  metric: Metric
  goalTitle?: string
  cycleLabel?: string
  onCommit: (nextValue: number | undefined) => void
}) {
  const fieldId = useId()
  const [draft, setDraft] = useState('')
  const name = metric.title.trim() || goalTitle?.trim() || 'metric'
  const tip = metricTipFromMetric(metric)
  const lastValue = `${tip.initial} → ${tip.current} → ${tip.target}`

  useEffect(() => {
    setDraft('')
  }, [metric.id, metric.currentValue])

  const save = () => {
    const next = parsedCurrent(draft)
    if (next == null) return
    onCommit(next)
    setDraft('')
  }

  return (
    <div className="pd-goal-log-update">
      <p className="pd-goal-log-update__label">Log update</p>
      <div className="pd-goal-log-update__row">
        <label className="pd-sr-only" htmlFor={fieldId}>
          Current progress
        </label>
        <input
          id={fieldId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
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
          pill
          aria-label={`Add update for ${name}`}
          disabled={parsedCurrent(draft) == null}
          onClick={save}
        >
          Add
        </Button>
      </div>
      <p className="pd-sr-only" aria-label={`Last value ${lastValue}`}>
        Last value: {lastValue}
        {cycleLabel ? ` · ${cycleLabel}` : ''}
      </p>
    </div>
  )
}
