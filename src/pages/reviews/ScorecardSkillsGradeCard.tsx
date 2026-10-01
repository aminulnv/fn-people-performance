import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { EmptyState, ListboxSelect } from '@/components/ui'
import {
  normalizeSkillGrade,
  skillGradeLabel,
  SKILL_GRADE_LEVELS,
  SKILL_GRADE_LISTBOX_OPTIONS,
  type SkillGradeLevel,
} from '@/lib/skills/reviewScores'
import type { Skill, SkillMastery } from '@/lib/skills/types'

type ScorecardSkill = Skill & { expectedHint?: string }

function gradeSelectClass(grade: SkillGradeLevel | null | '') {
  return [
    'pd-reviews-scorecard__goals-grade',
    grade ? `pd-reviews-scorecard__grade-select--${grade}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function masteryBands(mastery: SkillMastery): {
  level: SkillGradeLevel
  text: string
}[] {
  return SKILL_GRADE_LEVELS.flatMap((level) => {
    const text = mastery[level]?.trim() ?? ''
    return text ? [{ level, text }] : []
  })
}

function SkillRubric({
  mastery,
  selectedGrade,
}: {
  mastery: SkillMastery
  selectedGrade: SkillGradeLevel | ''
}) {
  const bands = masteryBands(mastery)
  if (bands.length === 0) return null
  return (
    <div className="pd-reviews-values-grade__details">
      <dl className="pd-reviews-values-grade__rubric">
        {bands.map(({ level, text }) => (
          <div
            key={level}
            className={[
              'pd-reviews-values-grade__band',
              selectedGrade === level ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <dt>{skillGradeLabel(level)}</dt>
            <dd>
              <p>{text}</p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
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
  grades: Record<string, string | ''>
  editing?: boolean
  locked?: boolean
  /** Skills is off — show saved grades read-only; they do not count. */
  priorOnly?: boolean
  profileHref?: string
  onGradeChange?: (skillId: string, grade: SkillGradeLevel | '') => void
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

      <div className="pd-reviews-skills-grade__panel">
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
              const grade = normalizeSkillGrade(grades[skill.id])
              const showRubric = masteryBands(skill.mastery).length > 0
              return (
                <li
                  key={skill.id}
                  className={[
                    'pd-reviews-skills-grade__row',
                    showRubric ? 'pd-reviews-skills-grade__row--rubric' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="pd-reviews-skills-grade__main">
                    <span className="pd-reviews-skills-grade__name">{skill.name}</span>
                    {skill.expectedHint ? (
                      <span className="pd-reviews-skills-grade__meta">
                        {skill.expectedHint}
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
                        onGradeChange(skill.id, normalizeSkillGrade(next))
                      }
                      options={SKILL_GRADE_LISTBOX_OPTIONS}
                    />
                  ) : grade ? (
                    <span
                      className={[
                        'pd-reviews-scorecard__band',
                        `pd-reviews-scorecard__band--${grade}`,
                      ].join(' ')}
                    >
                      {skillGradeLabel(grade)}
                    </span>
                  ) : (
                    <span className="pd-reviews-scorecard__grade-empty">
                      Not graded yet
                    </span>
                  )}
                  {showRubric ? (
                    <SkillRubric mastery={skill.mastery} selectedGrade={grade} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
