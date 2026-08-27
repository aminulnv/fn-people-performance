import { useState, type MouseEvent } from 'react'
import {
  BarChart3,
  Building2,
  Check,
  Hand,
  Info,
  Landmark,
  Lightbulb,
  Minus,
  MinusCircle,
  Plus,
  Scale,
  Shuffle,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { Tooltip } from '@/components/ui'
import {
  CALIBRATION_MODE_META,
  CALIBRATION_SECTION_HINTS,
  distributionTotal,
  GRADE_BAND_META,
  GRADE_BAND_ORDER,
  GRADE_RECOMMENDATION_META,
} from '@/lib/reviews/labels'
import { normalizeCalibration } from '@/lib/reviews/demoData'
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
import { GroupMembersEditor } from './GroupMembersEditor'

type CalibrationEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
  onSuccess?: (message: string) => void
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
  none: MinusCircle,
  manager_average: UserCheck,
  weighted: Scale,
}

function HintIcon({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top" portal delayMs={80}>
      <button
        type="button"
        className="pd-help-icon"
        aria-label={label}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          event.preventDefault()
        }}
      >
        <Info size={14} strokeWidth={2} aria-hidden />
      </button>
    </Tooltip>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint: string
}) {
  return (
    <header className="pd-reviews-edit-card__head">
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      <h3 className="pd-reviews-edit-section__title">{title}</h3>
      <HintIcon content={hint} label={`About ${title}`} />
    </header>
  )
}

export function CalibrationEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
  onSuccess,
}: CalibrationEditPageProps) {
  const [draft, setDraft] = useState<CalibrationLogic>(() =>
    normalizeCalibration(group.calibration),
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
        calibration: normalizeCalibration(draft),
      })
      void pending.catch(() => {
        /* Shown on the cycle page after close. */
      })
      onSuccess?.('Settings saved.')
      if (!embedded) onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save calibration.',
      )
    }
  }

  return (
    <EditPageShell
      title={`${group.name} · Calibration`}
      description="Who aligns grades, how they are suggested, and the target mix."
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
      actionsPlacement={embedded ? 'bottom' : 'top'}
    >
      <div className="pd-reviews-calibration-edit__choices">
        <section className="pd-reviews-edit-section">
          <SectionHeading
            icon={Shuffle}
            title="Calibrators"
            hint={CALIBRATION_SECTION_HINTS.calibrators}
          />
          <div
            className="pd-reviews-choice-picker pd-reviews-choice-picker--tiles"
            role="listbox"
            aria-label="Calibration mode"
          >
            {MODE_ORDER.map((id) => {
              const ModeIcon = MODE_ICONS[id]
              const meta = CALIBRATION_MODE_META[id]
              return (
                <div
                  key={id}
                  className={[
                    'pd-reviews-choice-picker__option',
                    draft.calibrationMode === id ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={draft.calibrationMode === id}
                    className="pd-reviews-choice-picker__choice"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, calibrationMode: id }))
                    }
                  >
                    <span className="pd-reviews-choice-picker__title">
                      <span className="pd-reviews-choice-picker__label">
                        <ModeIcon size={15} strokeWidth={1.9} aria-hidden />
                        <strong>{meta.label}</strong>
                      </span>
                      {draft.calibrationMode === id ? (
                        <Check size={15} strokeWidth={2.5} aria-hidden />
                      ) : null}
                    </span>
                  </button>
                  <HintIcon
                    content={meta.description}
                    label={`About ${meta.label}`}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <section className="pd-reviews-edit-section">
          <SectionHeading
            icon={Lightbulb}
            title="Recommendation"
            hint={CALIBRATION_SECTION_HINTS.recommendation}
          />
          <div
            className="pd-reviews-choice-picker pd-reviews-choice-picker--tiles"
            role="listbox"
            aria-label="Grade recommendation logic"
          >
            {RECOMMENDATION_ORDER.map((id) => {
              const RecommendationIcon = RECOMMENDATION_ICONS[id]
              const meta = GRADE_RECOMMENDATION_META[id]
              return (
                <div
                  key={id}
                  className={[
                    'pd-reviews-choice-picker__option',
                    draft.gradeRecommendation === id ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={draft.gradeRecommendation === id}
                    className="pd-reviews-choice-picker__choice"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, gradeRecommendation: id }))
                    }
                  >
                    <span className="pd-reviews-choice-picker__title">
                      <span className="pd-reviews-choice-picker__label">
                        <RecommendationIcon
                          size={15}
                          strokeWidth={1.9}
                          aria-hidden
                        />
                        <strong>{meta.label}</strong>
                      </span>
                      {draft.gradeRecommendation === id ? (
                        <Check size={15} strokeWidth={2.5} aria-hidden />
                      ) : null}
                    </span>
                  </button>
                  <HintIcon
                    content={meta.description}
                    label={`About ${meta.label}`}
                  />
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className="pd-reviews-group-form__block">
        <div className="pd-reviews-edit-card__head">
          <h3 className="pd-field__label">Senior leadership</h3>
          <HintIcon
            content={CALIBRATION_SECTION_HINTS.seniorLeadership}
            label="About Senior leadership"
          />
        </div>
        <p className="pd-reviews-flow__hint">
          People who sit in SLT calibration for this group.
        </p>
        <GroupMembersEditor
          memberIds={draft.sltMemberIds ?? []}
          onChange={(sltMemberIds) =>
            setDraft((prev) => ({ ...prev, sltMemberIds }))
          }
          searchLabel="Add senior leaders"
          placeholder="Add a person…"
          peopleOnly
        />
      </section>

      <section className="pd-reviews-edit-section">
        <header className="pd-reviews-distribution__header">
          <div>
            <SectionHeading
              icon={BarChart3}
              title="Distribution"
              hint={CALIBRATION_SECTION_HINTS.distribution}
            />
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
                  <HintIcon
                    content={GRADE_BAND_META[id].description}
                    label={`About ${GRADE_BAND_META[id].label}`}
                  />
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
