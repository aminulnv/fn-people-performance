import { CircleHelp, Heart } from 'lucide-react'
import { ListboxSelect, Tooltip } from '@/components/ui'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type { GradeBandId } from '@/lib/reviews/types'
import { withCatalogBehaviours } from '@/lib/values/catalog'
import {
  VALUE_BEHAVIOUR_BANDS,
  type CompanyValue,
  type ValueBehaviourBand,
} from '@/lib/values/types'
import { GRADE_LISTBOX_OPTIONS } from '@/pages/reviews/ScorecardGoalsCard'

function gradeSelectClass(grade: GradeBandId | null | '') {
  return [
    'pd-reviews-scorecard__goals-grade',
    grade ? `pd-reviews-scorecard__grade-select--${grade}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function valueHasRubric(value: CompanyValue): boolean {
  return value.behaviours.some((behaviour) =>
    VALUE_BEHAVIOUR_BANDS.some((band) => behaviour.bands[band].length > 0),
  )
}

function ValueRubricGuide({
  value,
  selectedBand,
}: {
  value: CompanyValue
  selectedBand: GradeBandId | ''
}) {
  return (
    <div className="pd-reviews-values-grade__guide">
      <p className="pd-reviews-values-grade__guide-title">{value.name}</p>
      <p className="pd-reviews-values-grade__guide-sub">
        What each grade looks like for this value.
      </p>
      {value.behaviours.map((behaviour) => (
        <div
          key={behaviour.id}
          className="pd-reviews-values-grade__behaviour-block"
        >
          {value.behaviours.length > 1 ? (
            <p className="pd-reviews-values-grade__behaviour">{behaviour.name}</p>
          ) : null}
          <dl className="pd-reviews-values-grade__rubric">
            {VALUE_BEHAVIOUR_BANDS.map((band) => {
              const statements = behaviour.bands[band]
              if (statements.length === 0) return null
              const isSelected = selectedBand === band
              return (
                <div
                  key={band}
                  className={[
                    'pd-reviews-values-grade__band',
                    isSelected ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <dt>{GRADE_BAND_META[band as ValueBehaviourBand].label}</dt>
                  <dd>
                    <ul>
                      {statements.map((statement) => (
                        <li key={statement}>{statement}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      ))}
    </div>
  )
}

function ValueGradeControl({
  value,
  grade,
  editing,
  locked,
  priorOnly,
  onGradeChange,
}: {
  value: CompanyValue
  grade: GradeBandId | ''
  editing: boolean
  locked: boolean
  priorOnly: boolean
  onGradeChange?: (valueId: string, grade: GradeBandId | '') => void
}) {
  if (editing && onGradeChange && !priorOnly) {
    return (
      <ListboxSelect
        className={gradeSelectClass(grade)}
        id={`scorecard-value-grade-${value.id}`}
        aria-label={`${value.name} grade`}
        value={grade}
        disabled={locked}
        placeholder="Select a grade"
        emptyLabel="Select a grade"
        onValueChange={(next) =>
          onGradeChange(value.id, next as GradeBandId | '')
        }
        options={GRADE_LISTBOX_OPTIONS}
      />
    )
  }
  if (grade) {
    return (
      <span
        className={[
          'pd-reviews-scorecard__band',
          `pd-reviews-scorecard__band--${grade}`,
        ].join(' ')}
      >
        {GRADE_LISTBOX_OPTIONS.find((option) => option.value === grade)?.label ??
          grade}
      </span>
    )
  }
  return (
    <span className="pd-reviews-scorecard__grade-empty">Not graded yet</span>
  )
}

function ValueGradeRow({
  value,
  grade,
  editing,
  locked,
  priorOnly,
  onGradeChange,
}: {
  value: CompanyValue
  grade: GradeBandId | ''
  editing: boolean
  locked: boolean
  priorOnly: boolean
  onGradeChange?: (valueId: string, grade: GradeBandId | '') => void
}) {
  const showGuide = valueHasRubric(value)

  return (
    <li className="pd-reviews-skills-grade__row">
      <div className="pd-reviews-skills-grade__main">
        <span className="pd-reviews-values-grade__title-row">
          <span className="pd-reviews-skills-grade__name">{value.name}</span>
          {showGuide ? (
            <Tooltip
              side="bottom"
              portal
              interactive
              delayMs={0}
              content={
                <ValueRubricGuide value={value} selectedBand={grade} />
              }
            >
              <button
                type="button"
                className="pd-help-icon"
                aria-label={`${value.name} grading guide`}
              >
                <CircleHelp size={14} strokeWidth={2} aria-hidden />
              </button>
            </Tooltip>
          ) : null}
        </span>
        {value.description ? (
          <span className="pd-reviews-skills-grade__meta">{value.description}</span>
        ) : null}
      </div>
      <ValueGradeControl
        value={value}
        grade={grade}
        editing={editing}
        locked={locked}
        priorOnly={priorOnly}
        onGradeChange={onGradeChange}
      />
    </li>
  )
}

export function ScorecardValuesGradeCard({
  values,
  grades,
  editing = false,
  locked = false,
  priorOnly = false,
  onGradeChange,
}: {
  values: CompanyValue[]
  grades: Record<string, GradeBandId | ''>
  editing?: boolean
  locked?: boolean
  priorOnly?: boolean
  onGradeChange?: (valueId: string, grade: GradeBandId | '') => void
}) {
  return (
    <section
      className="pd-reviews-scorecard__card"
      aria-label={priorOnly ? 'Core Values (previously graded)' : 'Core Values'}
    >
      <header className="pd-reviews-scorecard__card-head">
        <h2 className="pd-reviews-scorecard__section-title">
          <Heart size={18} strokeWidth={1.75} aria-hidden />
          Core Values
        </h2>
        {priorOnly ? (
          <span className="pd-reviews-skills-grade__prior-chip">
            Saved grades. Not counted while Core Values is off.
          </span>
        ) : null}
      </header>

      <div className="pd-reviews-skills-grade__panel">
        <ul className="pd-reviews-skills-grade__list">
          {values.map((raw) => {
            const value = withCatalogBehaviours(raw)
            return (
              <ValueGradeRow
                key={value.id}
                value={value}
                grade={grades[value.id] ?? ''}
                editing={editing}
                locked={locked}
                priorOnly={priorOnly}
                onGradeChange={onGradeChange}
              />
            )
          })}
        </ul>
      </div>
    </section>
  )
}
