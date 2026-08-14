import { useState } from 'react'
import { Pencil, Sparkles, UserRound } from 'lucide-react'
import { Input, Switch } from '@/components/ui'
import {
  REVIEW_TYPE_META,
  REVIEW_TYPE_ORDER,
} from '@/lib/reviews/labels'
import { DEFAULT_CYCLE_SETTINGS } from '@/lib/reviews/demoData'
import { updateCycleSettings } from '@/lib/reviews/store'
import type {
  CycleSettings,
  ReviewCycle,
  ReviewTypeId,
} from '@/lib/reviews/types'
import { EditPageShell } from './EditPageShell'
import {
  exclusionsLabel,
  GradePublishingExclusionsDrawer,
} from './GradePublishingExclusionsDrawer'

type SettingsEditPageProps = {
  cycle: ReviewCycle
  onClose: () => void
}

function normalizeSettings(settings: CycleSettings): CycleSettings {
  return {
    ...DEFAULT_CYCLE_SETTINGS,
    ...settings,
    reviewTypes: {
      ...DEFAULT_CYCLE_SETTINGS.reviewTypes,
      ...settings.reviewTypes,
      line_manager: true,
    },
    excludedEmployeeIds: [...(settings.excludedEmployeeIds ?? [])],
  }
}

export function SettingsEditPage({ cycle, onClose }: SettingsEditPageProps) {
  const [name, setName] = useState(cycle.name)
  const [startDate, setStartDate] = useState(cycle.startDate)
  const [endDate, setEndDate] = useState(cycle.endDate)
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeSettings(cycle.settings),
  )
  const [error, setError] = useState<string | null>(null)
  const [exclusionsOpen, setExclusionsOpen] = useState(false)

  const toggleType = (id: ReviewTypeId, enabled: boolean) => {
    if (REVIEW_TYPE_META[id].required) return
    setSettings((prev) =>
      normalizeSettings({
        ...prev,
        reviewTypes: { ...prev.reviewTypes, [id]: enabled },
      }),
    )
  }

  const save = () => {
    try {
      updateCycleSettings(cycle.id, {
        name,
        startDate,
        endDate,
        ...settings,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    }
  }

  return (
    <>
      <EditPageShell
        title="Cycle Settings"
        onBack={onClose}
        onSave={save}
        error={error}
      >
        <section className="pd-reviews-edit-card">
          <h3 className="pd-reviews-edit-card__title">General Settings</h3>
          <div className="pd-reviews-kv-edit">
            <Input
              label="Cycle name"
              hint="This will be used to identify the cycle, we recommend to not change the suggested name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="pd-reviews-modal__dates">
              <Input
                label="Cycle Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Cycle End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="pd-reviews-edit-card">
          <h3 className="pd-reviews-edit-card__title">Review Types</h3>
          <p className="pd-reviews-edit-card__lede">
            Based on your selection, we will create a separate Scorecard for each
            review type.
          </p>
          <ul className="pd-reviews-type-list">
            {REVIEW_TYPE_ORDER.map((id) => {
              const meta = REVIEW_TYPE_META[id]
              const enabled = settings.reviewTypes[id]
              return (
                <li key={id} className="pd-reviews-type-list__item">
                  <div className="pd-reviews-type-list__icon" aria-hidden>
                    <UserRound size={16} strokeWidth={1.75} />
                  </div>
                  <div className="pd-reviews-type-list__text">
                    <div className="pd-reviews-type-list__title-row">
                      <span className="pd-reviews-type-list__label">
                        {meta.label}
                      </span>
                      {meta.badge === 'required' ? (
                        <span className="pd-reviews-chip pd-reviews-chip--required">
                          Required
                        </span>
                      ) : null}
                      {meta.badge === 'recommended' ? (
                        <span className="pd-reviews-chip pd-reviews-chip--recommended">
                          <Sparkles size={12} strokeWidth={2} aria-hidden />
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <p className="pd-reviews-type-list__desc">
                      {meta.description}
                    </p>
                  </div>
                  <Switch
                    label={meta.label}
                    className="pd-reviews-type-list__switch"
                    checked={Boolean(enabled)}
                    disabled={Boolean(meta.required)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleType(id, e.target.checked)
                    }}
                  />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="pd-reviews-edit-card">
          <h3 className="pd-reviews-edit-card__title">Publishing Grades</h3>
          <div className="pd-reviews-publish-list">
            <div className="pd-reviews-publish-row">
              <div>
                <h4 className="pd-reviews-publish-row__title">
                  Grade publishing exclusions
                </h4>
                <p className="pd-reviews-publish-row__desc">
                  Select individual employees who will not receive their grade
                  automatically when results are published.
                </p>
              </div>
              <div className="pd-reviews-publish-row__meta">
                <span className="pd-reviews-publish-row__value">
                  <UserRound size={14} strokeWidth={1.75} aria-hidden />
                  {exclusionsLabel(settings.excludedEmployeeIds.length)}
                </span>
                <button
                  type="button"
                  className="pd-reviews-edit-link"
                  onClick={() => setExclusionsOpen(true)}
                >
                  <Pencil size={14} strokeWidth={2} aria-hidden />
                  Edit
                </button>
              </div>
            </div>

            <div className="pd-reviews-publish-row">
              <div>
                <h4 className="pd-reviews-publish-row__title">
                  Auto scorecard generation
                </h4>
                <p className="pd-reviews-publish-row__desc">
                  Automatically process scorecard generation and keep employee
                  data in sync when the cycle advances.
                </p>
              </div>
              <Switch
                label="Auto scorecard generation"
                className="pd-reviews-type-list__switch"
                checked={settings.autoScorecardGeneration}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoScorecardGeneration: e.target.checked,
                  }))
                }
              />
            </div>
          </div>
        </section>
      </EditPageShell>

      <GradePublishingExclusionsDrawer
        open={exclusionsOpen}
        cycleName={name}
        selectedIds={settings.excludedEmployeeIds}
        onChange={(ids) =>
          setSettings((prev) => ({
            ...prev,
            excludedEmployeeIds: ids,
          }))
        }
        onClose={() => setExclusionsOpen(false)}
      />
    </>
  )
}
