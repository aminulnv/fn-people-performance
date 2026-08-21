import { useState } from 'react'
import {
  BarChart3,
  Building2,
  Check,
  Hand,
  Landmark,
  Minus,
  Plus,
  Scale,
  Shuffle,
  Slash,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import {
  CALIBRATION_MODE_META,
  distributionTotal,
  GRADE_BAND_META,
  GRADE_BAND_ORDER,
  GRADE_RECOMMENDATION_META,
} from '@/lib/reviews/labels'
import { updateCycleGroup } from '@/lib/reviews/store'
import type {
  CalibrationLogic,
  CalibrationModeId,
  CycleGroup,
  GradeBandId,
  GradeRecommendationId,
  ReviewCycle,
} from '@/lib/reviews/types'
import { EditPageShell } from './EditPageShell'

type CalibrationEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
}

const MODE_ORDER: CalibrationModeId[] = ['manual', 'department', 'central']
const RECOMMENDATION_ORDER: GradeRecommendationId[] = [
  'none',
  'manager_average',
  'weighted',
]

const MODE_ICONS: Record<CalibrationModeId, LucideIcon> = {
  manual: Hand,
  department: Building2,
  central: Landmark,
}

const RECOMMENDATION_ICONS: Record<GradeRecommendationId, LucideIcon> = {
  none: Slash,
  manager_average: UserCheck,
  weighted: Scale,
}

export function CalibrationEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
}: CalibrationEditPageProps) {
  const [draft, setDraft] = useState<CalibrationLogic>(() =>
    structuredClone(group.calibration),
  )
  const [error, setError] = useState<string | null>(null)

  const total = distributionTotal(draft.gradeDistribution)

  const adjustBand = (id: GradeBandId, delta: number) => {
    setDraft((prev) => {
      const nextValue = Math.max(
        0,
        Math.min(100, prev.gradeDistribution[id] + delta),
      )
      return {
        ...prev,
        gradeDistribution: {
          ...prev.gradeDistribution,
          [id]: nextValue,
        },
      }
    })
  }

  const save = () => {
    if (total !== 100) {
      setError(`Grade distribution must total 100% (currently ${total}%).`)
      return
    }
    setError(null)
    try {
      const pending = updateCycleGroup(cycle.id, group.id, {
        calibration: draft,
      })
      void pending.catch(() => {
        /* Shown on the cycle page after close. */
      })
      if (!embedded) onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save calibration.',
      )
    }
  }

  return (
    <EditPageShell
      title={`${group.name} · Calculation & calibration`}
      description="Choose how grades are recommended, reviewed, and distributed."
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
    >
      <div className="pd-reviews-calibration-edit__choices">
        <section className="pd-reviews-edit-section">
          <header className="pd-reviews-edit-card__head">
            <Shuffle size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-section__title">Calibrators</h3>
          </header>
          <div
            className="pd-reviews-choice-picker pd-reviews-choice-picker--tiles"
            role="listbox"
            aria-label="Calibration mode"
          >
            {MODE_ORDER.map((id) => {
              const ModeIcon = MODE_ICONS[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={draft.calibrationMode === id}
                  className={[
                    'pd-reviews-choice-picker__option',
                    draft.calibrationMode === id ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, calibrationMode: id }))
                  }
                  title={CALIBRATION_MODE_META[id].description}
                >
                  <span className="pd-reviews-choice-picker__title">
                    <span className="pd-reviews-choice-picker__label">
                      <ModeIcon size={15} strokeWidth={1.9} aria-hidden />
                      <strong>{CALIBRATION_MODE_META[id].label}</strong>
                    </span>
                    {draft.calibrationMode === id ? (
                      <Check size={15} strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="pd-reviews-edit-section">
          <header className="pd-reviews-edit-card__head">
            <Slash size={18} strokeWidth={1.75} />
            <h3 className="pd-reviews-edit-section__title">Recommendation</h3>
          </header>
          <div
            className="pd-reviews-choice-picker pd-reviews-choice-picker--tiles"
            role="listbox"
            aria-label="Grade recommendation logic"
          >
            {RECOMMENDATION_ORDER.map((id) => {
              const RecommendationIcon = RECOMMENDATION_ICONS[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={draft.gradeRecommendation === id}
                  className={[
                    'pd-reviews-choice-picker__option',
                    draft.gradeRecommendation === id ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, gradeRecommendation: id }))
                  }
                  title={GRADE_RECOMMENDATION_META[id].description}
                >
                  <span className="pd-reviews-choice-picker__title">
                    <span className="pd-reviews-choice-picker__label">
                      <RecommendationIcon
                        size={15}
                        strokeWidth={1.9}
                        aria-hidden
                      />
                      <strong>{GRADE_RECOMMENDATION_META[id].label}</strong>
                    </span>
                    {draft.gradeRecommendation === id ? (
                      <Check size={15} strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <section className="pd-reviews-edit-section">
        <header className="pd-reviews-distribution__header">
          <div>
            <div className="pd-reviews-edit-card__head">
              <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-section__title">Distribution</h3>
            </div>
          </div>
          <span
            className={[
              'pd-reviews-distribution__total',
              total === 100 ? 'is-ok' : 'is-warn',
            ].join(' ')}
          >
            {total}% total
          </span>
        </header>
        <div className="pd-reviews-distribution__bar" aria-hidden>
          {GRADE_BAND_ORDER.map((id) => {
            const value = draft.gradeDistribution[id]
            if (value <= 0) return null
            return (
              <span
                key={id}
                className={`pd-reviews-distribution__seg is-${id}`}
                style={{ flexGrow: value }}
              />
            )
          })}
        </div>
        <ul className="pd-reviews-distribution">
          {GRADE_BAND_ORDER.map((id) => (
            <li key={id} className={`pd-reviews-distribution__row is-${id}`}>
              <div className="pd-reviews-distribution__text">
                <span className="pd-reviews-distribution__label">
                  {GRADE_BAND_META[id].label}
                </span>
              </div>
              <div className="pd-reviews-distribution__controls">
                <button
                  type="button"
                  className="pd-reviews-stepper"
                  aria-label={`Decrease ${GRADE_BAND_META[id].label}`}
                  onClick={() => adjustBand(id, -1)}
                >
                  <Minus size={14} strokeWidth={2.25} aria-hidden />
                </button>
                <span className="pd-reviews-distribution__value">
                  {draft.gradeDistribution[id]}%
                </span>
                <button
                  type="button"
                  className="pd-reviews-stepper"
                  aria-label={`Increase ${GRADE_BAND_META[id].label}`}
                  onClick={() => adjustBand(id, 1)}
                >
                  <Plus size={14} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </EditPageShell>
  )
}
