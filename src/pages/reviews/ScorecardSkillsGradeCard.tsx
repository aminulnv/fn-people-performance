import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { EmptyState, ListboxSelect } from '@/components/ui'
import { GRADE_LISTBOX_OPTIONS } from '@/pages/reviews/ScorecardGoalsCard'
import type { GradeBandId } from '@/lib/reviews/types'
import type { Skill } from '@/lib/skills/types'

type ScorecardSkill = Skill & { expectedHint?: string }

function gradeSelectClass(grade: GradeBandId | null | '') {
  return [
    'pd-reviews-scorecard__goals-grade',
    grade ? `pd-reviews-scorecard__grade-select--${grade}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function ScorecardSkillsGradeCard({
  skills,
  grades,
  editing = false,
  locked = false,
  priorOnly = false,
  profileHref,
  onGradeChange,
}: {
  skills: ScorecardSkill[]
  grades: Record<string, GradeBandId | ''>
  editing?: boolean
  locked?: boolean
  /** Skills is off — show saved grades read-only; they do not count. */
  priorOnly?: boolean
  profileHref?: string
  onGradeChange?: (skillId: string, grade: GradeBandId | '') => void
}) {
  return (
    <section
      className="pd-reviews-scorecard__card"
      aria-label={priorOnly ? 'Skills (previously graded)' : 'Skills'}
    >
      <header className="pd-reviews-scorecard__card-head">
        <h2 className="pd-reviews-scorecard__section-title">
          <Sparkles size={18} strokeWidth={1.75} aria-hidden />
          Skills
        </h2>
        {priorOnly ? (
          <span className="pd-reviews-skills-grade__prior-chip">
            Saved grades. Not counted while Skills is off.
          </span>
        ) : null}
      </header>

      {skills.length === 0 ? (
        <EmptyState
          className="pd-empty--inline"
          title="No skills on their role yet"
          description="Skills come from the role competency matrix, plus any extras on the profile."
          action={
            profileHref ? (
              <Link
                to={profileHref}
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
              >
                Open profile
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="pd-reviews-skills-grade__list">
          {skills.map((skill) => {
            const grade = grades[skill.id] ?? ''
            return (
              <li key={skill.id} className="pd-reviews-skills-grade__row">
                <div className="pd-reviews-skills-grade__main">
                  <span className="pd-reviews-skills-grade__name">{skill.name}</span>
                  {skill.expectedHint ? (
                    <span className="pd-reviews-skills-grade__meta">
                      {skill.expectedHint}
                    </span>
                  ) : skill.department ? (
                    <span className="pd-reviews-skills-grade__meta">
                      {skill.department}
                    </span>
                  ) : null}
                </div>
                {editing && onGradeChange && !priorOnly ? (
                  <ListboxSelect
                    className={gradeSelectClass(grade)}
                    id={`scorecard-skill-grade-${skill.id}`}
                    aria-label={`${skill.name} grade`}
                    value={grade}
                    disabled={locked}
                    placeholder="Select a grade"
                    emptyLabel="Select a grade"
                    onValueChange={(next) =>
                      onGradeChange(skill.id, next as GradeBandId | '')
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
      )}
    </section>
  )
}
