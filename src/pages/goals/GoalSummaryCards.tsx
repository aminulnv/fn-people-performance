import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui'
import { goalCompletion } from '@/lib/goalsApi'
import type { Goal, GoalProgressStatus, PersonGoals } from '@/lib/goals/types'
import {
  GOAL_PROGRESS_STATUS_OPTIONS,
  progressStatusClass,
  trackLabel,
  trackToneClass,
} from './goalHelpers'

type GoalSummaryCardsProps = {
  goal: Goal
  status: PersonGoals['status']
  cycleLabel: string
  isCurrentCycle?: boolean
  canChangeStatus?: boolean
  onProgressStatus?: (status: GoalProgressStatus) => void
  onWeightChange?: (weight: number) => void
}

export function GoalSummaryCards({
  goal,
  status,
  cycleLabel,
  isCurrentCycle = false,
  canChangeStatus = false,
  onProgressStatus,
  onWeightChange,
}: GoalSummaryCardsProps) {
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const completion = Math.round(goalCompletion(goal))
  const track = trackLabel(status, completion, goal.progressStatus)

  useEffect(() => {
    if (!statusOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!statusRef.current?.contains(event.target as Node)) {
        setStatusOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStatusOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [statusOpen])

  return (
    <div
      className="pd-people__summary pd-goal-view__summary"
      role="group"
      aria-label="Goal summary"
    >
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Cycle</span>
        <span className="pd-people__summary-value pd-goal-view__cycle">
          {cycleLabel}
          {isCurrentCycle ? <Badge variant="completed">Current</Badge> : null}
        </span>
      </div>
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Status</span>
        {canChangeStatus && onProgressStatus ? (
          <div ref={statusRef} className="pd-goal-view__status">
            <button
              type="button"
              className={`pd-people__summary-value pd-goal-view__status-btn ${trackToneClass(track.tone)}`}
              aria-haspopup="listbox"
              aria-expanded={statusOpen}
              onClick={() => setStatusOpen((open) => !open)}
            >
              {track.label}
              <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
            </button>
            {statusOpen ? (
              <div
                className="pd-goal-view__status-menu"
                role="listbox"
                aria-label="Status"
              >
                {GOAL_PROGRESS_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={goal.progressStatus === option.id}
                    className={`pd-goal-view__status-option ${progressStatusClass(option.id)}`}
                    onClick={() => {
                      onProgressStatus(option.id)
                      setStatusOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span
            className={`pd-people__summary-value pd-goal-view__status-btn ${trackToneClass(track.tone)} is-static`}
          >
            {track.label}
          </span>
        )}
      </div>
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Goal weight</span>
        {onWeightChange ? (
          <label className="pd-people__summary-value pd-goal-view__weight-edit">
            <span className="pd-sr-only">Goal weight</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Goal weight"
              value={goal.weight}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '')
                onWeightChange(Math.min(100, Number(digits) || 0))
              }}
            />
            <span aria-hidden>%</span>
          </label>
        ) : (
          <span className="pd-people__summary-value">{goal.weight}%</span>
        )}
      </div>
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Completion</span>
        <span className="pd-people__summary-value">{completion}%</span>
      </div>
    </div>
  )
}
