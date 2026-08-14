import { useState } from 'react'
import {
  BarChart3,
  FileText,
  Flag,
  Shield,
} from 'lucide-react'
import { Input } from '@/components/ui'
import { formatDateTimeValue } from '@/lib/reviews/labels'
import { updateCycleStagesConfig } from '@/lib/reviews/store'
import type {
  CycleStagesConfig,
  DateTimeValue,
  ReviewCycle,
  StageProcessMode,
} from '@/lib/reviews/types'
import { EditPageShell } from './EditPageShell'

type StagesEditPageProps = {
  cycle: ReviewCycle
  onClose: () => void
}

export function StagesEditPage({ cycle, onClose }: StagesEditPageProps) {
  const [draft, setDraft] = useState<CycleStagesConfig>(() =>
    structuredClone(cycle.stagesConfig),
  )
  const [error, setError] = useState<string | null>(null)

  const setProcessMode = (mode: StageProcessMode) => {
    setDraft((prev) => ({ ...prev, processMode: mode }))
  }

  const save = () => {
    try {
      updateCycleStagesConfig(cycle.id, draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save stages.')
    }
  }

  return (
    <EditPageShell
      title="Cycle stages"
      description="These settings define the steps and timelines for all future review cycles."
      onBack={onClose}
      onSave={save}
      error={error}
    >
      <section className="pd-reviews-edit-card">
        <h3 className="pd-reviews-edit-card__title">
          How to process cycle stages?
        </h3>
        <div className="pd-reviews-process">
          <label
            className={[
              'pd-reviews-process__option',
              draft.processMode === 'schedule' ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name="process-mode"
              checked={draft.processMode === 'schedule'}
              onChange={() => setProcessMode('schedule')}
            />
            <span className="pd-reviews-process__radio" aria-hidden />
            <span>
              <span className="pd-reviews-process__label">Schedule</span>
              <span className="pd-reviews-process__hint">
                Cycle stages change on fixed dates.
              </span>
            </span>
          </label>
          <label
            className={[
              'pd-reviews-process__option',
              draft.processMode === 'manual' ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name="process-mode"
              checked={draft.processMode === 'manual'}
              onChange={() => setProcessMode('manual')}
            />
            <span className="pd-reviews-process__radio" aria-hidden />
            <span>
              <span className="pd-reviews-process__label">Manual</span>
              <span className="pd-reviews-process__hint">
                Move to the next stage manually.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="pd-reviews-edit-card">
        <header className="pd-reviews-edit-card__head">
          <Flag size={16} strokeWidth={1.75} aria-hidden />
          <h3 className="pd-reviews-edit-card__title">Goal setting period</h3>
        </header>
        <div className="pd-reviews-date-grid">
          <DateRangeFields
            label="Department Goals"
            value={draft.goals.department}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                goals: { ...prev.goals, department: value },
              }))
            }
          />
          <DateRangeFields
            label="Team Goals"
            value={draft.goals.team}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                goals: { ...prev.goals, team: value },
              }))
            }
          />
          <DateRangeFields
            label="Employee Goals"
            value={draft.goals.employee}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                goals: { ...prev.goals, employee: value },
              }))
            }
          />
        </div>
      </section>

      <section className="pd-reviews-edit-card">
        <header className="pd-reviews-edit-card__head">
          <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
          <h3 className="pd-reviews-edit-card__title">Performance period</h3>
        </header>
        <div className="pd-reviews-date-grid">
          <DateTimeFields
            label="Employee Start"
            value={draft.performance.employeeStart}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                performance: { ...prev.performance, employeeStart: value },
              }))
            }
          />
          <DateTimeFields
            label="Employee End"
            value={draft.performance.employeeEnd}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                performance: { ...prev.performance, employeeEnd: value },
              }))
            }
          />
          <DateTimeFields
            label="Manager Start"
            value={draft.performance.managerStart}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                performance: { ...prev.performance, managerStart: value },
              }))
            }
          />
          <DateTimeFields
            label="Manager End"
            value={draft.performance.managerEnd}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                performance: { ...prev.performance, managerEnd: value },
              }))
            }
          />
        </div>
      </section>

      <section className="pd-reviews-edit-card">
        <header className="pd-reviews-edit-card__head">
          <Shield size={16} strokeWidth={1.75} aria-hidden />
          <h3 className="pd-reviews-edit-card__title">Calibration</h3>
        </header>
        <p className="pd-reviews-edit-card__lede">
          If enabled, calibration of grades can occur at department level by
          their owners.
        </p>
        <div className="pd-reviews-date-grid">
          <DateTimeFields
            label="Start date/time"
            value={draft.calibration.start}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                calibration: { ...prev.calibration, start: value },
              }))
            }
          />
          <div className="pd-reviews-manual-start">
            <span className="pd-field__label">Stages timeline</span>
            <div className="pd-reviews-manual-start__pill">
              <span className="pd-reviews-manual-start__caption">
                manual start date
              </span>
              <span className="pd-reviews-manual-start__value">
                {formatDateTimeValue(draft.calibration.manualStart)}
              </span>
              <Input
                type="date"
                aria-label="Manual start date"
                value={draft.calibration.manualStart.date}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    calibration: {
                      ...prev.calibration,
                      manualStart: {
                        ...prev.calibration.manualStart,
                        date: e.target.value,
                      },
                    },
                  }))
                }
              />
            </div>
          </div>
          <DateTimeFields
            label="End date/time"
            value={draft.calibration.end}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                calibration: { ...prev.calibration, end: value },
              }))
            }
          />
        </div>
      </section>

      <section className="pd-reviews-edit-card">
        <header className="pd-reviews-edit-card__head">
          <FileText size={16} strokeWidth={1.75} aria-hidden />
          <h3 className="pd-reviews-edit-card__title">Publish results</h3>
        </header>
        <div className="pd-reviews-date-grid">
          <DateTimeFields
            label="Publish to manager"
            value={draft.publish.toManager}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                publish: { ...prev.publish, toManager: value },
              }))
            }
          />
          <DateTimeFields
            label="Publish to All"
            value={draft.publish.toAll}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                publish: { ...prev.publish, toAll: value },
              }))
            }
          />
        </div>
      </section>
    </EditPageShell>
  )
}

function DateRangeFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: { startDate: string; endDate: string }
  onChange: (value: { startDate: string; endDate: string }) => void
}) {
  return (
    <div className="pd-reviews-date-block">
      <h4 className="pd-reviews-date-block__title">{label}</h4>
      <div className="pd-reviews-modal__dates">
        <Input
          label="Start date"
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
        <Input
          label="End date"
          type="date"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        />
      </div>
    </div>
  )
}

function DateTimeFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: DateTimeValue
  onChange: (value: DateTimeValue) => void
}) {
  return (
    <div className="pd-reviews-date-block">
      <h4 className="pd-reviews-date-block__title">{label}</h4>
      <div className="pd-reviews-modal__dates">
        <Input
          label="Date"
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
        <Input
          label="Start/End time (UTC)"
          type="time"
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
        />
      </div>
    </div>
  )
}
