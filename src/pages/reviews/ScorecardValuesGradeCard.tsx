import { ListboxSelect } from '@/components/ui'
import type { GradeBandId } from '@/lib/reviews/types'
import type { CompanyValue } from '@/lib/values/types'
import { GRADE_LISTBOX_OPTIONS } from '@/pages/reviews/ScorecardGoalsCard'

function gradeSelectClass(grade: GradeBandId | null | '') {
  return [
    'pd-reviews-scorecard__goals-grade',
    grade ? `pd-reviews-scorecard__grade-select--${grade}` : '',
  ]
    .filter(Boolean)
    .join(' ')
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
        <h2 className="pd-reviews-scorecard__section-title">Core Values</h2>
        {priorOnly ? (
          <span className="pd-reviews-skills-grade__prior-chip">
            Saved grades. Not counted while Core Values is off.
          </span>
        ) : null}
      </header>

      <ul className="pd-reviews-skills-grade__list">
        {values.map((value) => {
          const grade = grades[value.id] ?? ''
          return (
            <li key={value.id} className="pd-reviews-skills-grade__row">
              <div className="pd-reviews-skills-grade__main">
                <span className="pd-reviews-skills-grade__name">{value.name}</span>
                {value.description ? (
                  <span className="pd-reviews-skills-grade__meta">
                    {value.description}
                  </span>
                ) : null}
              </div>
              {editing && onGradeChange && !priorOnly ? (
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
              ) : grade ? (
                <span
                  className={[
                    'pd-reviews-scorecard__band',
                    `pd-reviews-scorecard__band--${grade}`,
                  ].join(' ')}
                >
                  {GRADE_LISTBOX_OPTIONS.find((option) => option.value === grade)
                    ?.label ?? grade}
                </span>
              ) : (
                <span className="pd-reviews-flow__hint">Not graded yet</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
