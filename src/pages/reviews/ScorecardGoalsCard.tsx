import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import { EmptyState, ListboxSelect } from '@/components/ui'
import type { Goal } from '@/lib/goalsApi'
import { getGoalsSnapshotForCycle } from '@/lib/goals/store'
import { GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import { gradeLabel } from '@/lib/reviews/scorecards'
import type { GradeBandId } from '@/lib/reviews/types'
import { GoalCreateDrawer } from '@/pages/goals/GoalCreateDrawer'
import { GoalDetailView } from '@/pages/goals/GoalDetailView'
import { goalTitle, goalsGoalPath } from '@/pages/goals/goalHelpers'
import { GoalsTable } from '@/pages/goals/GoalsTable'

export const GRADE_LISTBOX_OPTIONS = GRADE_BAND_ORDER.map((id) => ({
  value: id,
  label: gradeLabel(id),
  className: `pd-reviews-scorecard__grade-tone--${id}`,
}))

function gradeSelectClass(grade: GradeBandId | null | '') {
  return [
    'pd-reviews-scorecard__goals-grade',
    grade ? `pd-reviews-scorecard__grade-select--${grade}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function ScorecardGoalsCard({
  cycleId,
  personId,
  owner,
  cycleLabel,
  goals,
  overallPercent,
  overallBand,
  goalsHref,
  editing = false,
  goalsWeight,
  goalsGrade = null,
  onGoalsGradeChange,
  gradeLocked = false,
  title = 'Goals',
  embedded = false,
  hideTitle = false,
}: {
  cycleId?: string
  personId?: string
  owner?: { id: string; name: string; avatarUrl?: string }
  cycleLabel: string
  goals: Goal[]
  overallPercent: number
  overallBand: GradeBandId | null
  goalsHref?: string
  editing?: boolean
  goalsWeight?: number
  goalsGrade?: GradeBandId | null
  onGoalsGradeChange?: (grade: GradeBandId | '') => void
  gradeLocked?: boolean
  title?: string
  embedded?: boolean
  hideTitle?: boolean
}) {
  const [openGoalId, setOpenGoalId] = useState<string | null>(null)
  const [openMeasureKey, setOpenMeasureKey] = useState<string | null>(null)
  const showGradeEditor = Boolean(editing && onGoalsGradeChange)
  const openIndex = goals.findIndex((goal) => goal.id === openGoalId)
  const openGoal = openIndex >= 0 ? goals[openIndex] : undefined
  const personGoals = cycleId && personId
    ? getGoalsSnapshotForCycle(cycleId).byPerson[personId]
    : undefined
  const heading = (
    <>
      <Target size={18} strokeWidth={1.75} aria-hidden />
      {title}
    </>
  )
  return (
    <section
      className={
        embedded
          ? 'pd-reviews-quarters__goals'
          : 'pd-reviews-scorecard__card'
      }
      aria-label={title}
    >
      <header className="pd-reviews-scorecard__card-head">
        <div className="pd-reviews-scorecard__card-title">
          {hideTitle ? null : (
            <h2 className="pd-reviews-scorecard__section-title">
              {goalsHref ? (
                <Link to={goalsHref} className="pd-reviews-scorecard__section-link">
                  {heading}
                </Link>
              ) : (
                heading
              )}
            </h2>
          )}
          {showGradeEditor ? (
            <ListboxSelect
              className={gradeSelectClass(goalsGrade)}
              id="scorecard-goals-grade"
              aria-label={
                goalsWeight != null ? `Goals (${goalsWeight}%)` : 'Goals Grade'
              }
              value={goalsGrade ?? ''}
              disabled={gradeLocked}
              placeholder="Select a grade"
              emptyLabel="Select a grade"
              onValueChange={(next) =>
                onGoalsGradeChange?.(next as GradeBandId | '')
              }
              options={GRADE_LISTBOX_OPTIONS}
            />
          ) : overallBand ? (
            <span
              className={[
                'pd-reviews-scorecard__band',
                `pd-reviews-scorecard__band--${overallBand}`,
              ].join(' ')}
            >
              {gradeLabel(overallBand)}
            </span>
          ) : null}
        </div>
        {goals.length > 0 ? (
          <span className="pd-reviews-scorecard__goals-percent">
            {overallPercent}% complete
          </span>
        ) : null}
      </header>

      {goals.length === 0 ? (
        <EmptyState
          className="pd-empty--inline"
          icon={Target}
          title={`No Goals For ${cycleLabel}`}
          description="Add or approve goals on the Goals page before they can roll into this review."
          action={
            goalsHref ? (
              <Link
                to={goalsHref}
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
              >
                Open Goals
              </Link>
            ) : null
          }
        />
      ) : (
        <GoalsTable
          label={`Goals for ${cycleLabel}`}
          rows={goals.map((goal, index) => ({
            goal,
            title: goalTitle(goal, index),
          }))}
          openGoalId={openGoalId}
          onOpen={(id, measureKey) => {
            setOpenGoalId(id)
            setOpenMeasureKey(measureKey ?? null)
          }}
        />
      )}

      {openGoal ? (
        <GoalCreateDrawer
          label={`View ${goalTitle(openGoal, openIndex)}`}
          closeLabel="Close Goal"
          onClose={() => {
            setOpenGoalId(null)
            setOpenMeasureKey(null)
          }}
        >
          <div className="pd-goals-review">
            <GoalDetailView
              goal={openGoal}
              highlightMeasureKey={openMeasureKey}
              index={openIndex}
              owner={
                owner ?? {
                  name: 'Goals',
                }
              }
              cycleId={cycleId}
              subjectId={personId}
              fullViewHref={
                cycleId && personId
                  ? goalsGoalPath(cycleId, personId, openGoal.id)
                  : goalsHref
              }
              cycleLabel={cycleLabel}
              status={personGoals?.status ?? 'draft'}
              postWindowApprovalStage={personGoals?.postWindowApprovalStage}
              commentAuthorName={owner?.name ?? 'Reviewer'}
              onChange={() => undefined}
            />
          </div>
        </GoalCreateDrawer>
      ) : null}
    </section>
  )
}
