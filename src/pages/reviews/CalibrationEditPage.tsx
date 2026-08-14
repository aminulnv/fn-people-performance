import { useState } from 'react'
import {
  BarChart3,
  Minus,
  Pencil,
  Plus,
  Shuffle,
  Slash,
} from 'lucide-react'
import {
  CALIBRATION_MODE_META,
  distributionTotal,
  GRADE_BAND_META,
  GRADE_BAND_ORDER,
  GRADE_RECOMMENDATION_META,
} from '@/lib/reviews/labels'
import { updateCalibrationLogic } from '@/lib/reviews/store'
import type {
  CalibrationLogic,
  CalibrationModeId,
  GradeBandId,
  GradeRecommendationId,
  ReviewCycle,
} from '@/lib/reviews/types'
import { EditPageShell } from './EditPageShell'

type CalibrationEditPageProps = {
  cycle: ReviewCycle
  onClose: () => void
}

const MODE_ORDER: CalibrationModeId[] = ['manual', 'department', 'central']
const RECOMMENDATION_ORDER: GradeRecommendationId[] = [
  'none',
  'manager_average',
  'weighted',
]

export function CalibrationEditPage({
  cycle,
  onClose,
}: CalibrationEditPageProps) {
  const [draft, setDraft] = useState<CalibrationLogic>(() =>
    structuredClone(cycle.calibration),
  )
  const [pickingMode, setPickingMode] = useState(false)
  const [pickingRecommendation, setPickingRecommendation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = distributionTotal(draft.gradeDistribution)

  const adjustBand = (id: GradeBandId, delta: number) => {
    setDraft((prev) => {
      const nextValue = Math.max(0, Math.min(100, prev.gradeDistribution[id] + delta))
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
    try {
      updateCalibrationLogic(cycle.id, draft)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save calibration.',
      )
    }
  }

  const modeMeta = CALIBRATION_MODE_META[draft.calibrationMode]
  const recommendationMeta =
    GRADE_RECOMMENDATION_META[draft.gradeRecommendation]

  return (
    <EditPageShell
      title="Calculation & Calibration logic"
      onBack={onClose}
      onSave={save}
      error={error}
    >
      <section className="pd-reviews-edit-section">
        <h3 className="pd-reviews-edit-section__title">
          Who should calibrate grades?
        </h3>
        <div className="pd-reviews-choice-card">
          <div className="pd-reviews-choice-card__icon" aria-hidden>
            <Shuffle size={18} strokeWidth={1.75} />
          </div>
          <div className="pd-reviews-choice-card__text">
            <span className="pd-reviews-choice-card__label">{modeMeta.label}</span>
            <span className="pd-reviews-choice-card__desc">
              {modeMeta.description}
            </span>
          </div>
          <button
            type="button"
            className="pd-reviews-icon-edit"
            aria-label="Edit calibration mode"
            aria-expanded={pickingMode}
            onClick={() => {
              setPickingMode((v) => !v)
              setPickingRecommendation(false)
            }}
          >
            <Pencil size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        {pickingMode ? (
          <div className="pd-reviews-choice-picker" role="listbox">
            {MODE_ORDER.map((id) => (
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
                onClick={() => {
                  setDraft((prev) => ({ ...prev, calibrationMode: id }))
                  setPickingMode(false)
                }}
              >
                <strong>{CALIBRATION_MODE_META[id].label}</strong>
                <span>{CALIBRATION_MODE_META[id].description}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="pd-reviews-edit-section">
        <h3 className="pd-reviews-edit-section__title">
          Grade recommendation logic
        </h3>
        <p className="pd-reviews-edit-section__lede">
          This is the default grade calculation logic that will be used to
          define employees final grade if no calibration input is provided
        </p>
        <div className="pd-reviews-choice-card">
          <div className="pd-reviews-choice-card__icon" aria-hidden>
            <Slash size={18} strokeWidth={1.75} />
          </div>
          <div className="pd-reviews-choice-card__text">
            <span className="pd-reviews-choice-card__label">
              {recommendationMeta.label}
            </span>
            <span className="pd-reviews-choice-card__desc">
              {recommendationMeta.description}
            </span>
          </div>
          <button
            type="button"
            className="pd-reviews-icon-edit"
            aria-label="Edit grade recommendation"
            aria-expanded={pickingRecommendation}
            onClick={() => {
              setPickingRecommendation((v) => !v)
              setPickingMode(false)
            }}
          >
            <Pencil size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        {pickingRecommendation ? (
          <div className="pd-reviews-choice-picker" role="listbox">
            {RECOMMENDATION_ORDER.map((id) => (
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
                onClick={() => {
                  setDraft((prev) => ({ ...prev, gradeRecommendation: id }))
                  setPickingRecommendation(false)
                }}
              >
                <strong>{GRADE_RECOMMENDATION_META[id].label}</strong>
                <span>{GRADE_RECOMMENDATION_META[id].description}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="pd-reviews-edit-section">
        <header className="pd-reviews-edit-card__head">
          <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
          <h3 className="pd-reviews-edit-section__title">
            Calibration grade distribution
          </h3>
        </header>
        <p className="pd-reviews-edit-section__lede">
          The calibration logic sets a benchmark for expected results by
          defining the percentage of employees you expect to achieve each
          performance grade.
        </p>
        <ul className="pd-reviews-distribution">
          {GRADE_BAND_ORDER.map((id) => (
            <li key={id} className="pd-reviews-distribution__row">
              <div className="pd-reviews-distribution__text">
                <span className="pd-reviews-distribution__label">
                  {GRADE_BAND_META[id].label}
                </span>
                <span className="pd-reviews-distribution__hint">
                  % of employees
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
        <p
          className={[
            'pd-reviews-distribution__total',
            total === 100 ? 'is-ok' : 'is-warn',
          ].join(' ')}
        >
          Total: {total}%
        </p>
      </section>
    </EditPageShell>
  )
}
