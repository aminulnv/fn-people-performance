import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Download, Star, Target, TrendingUp, Trophy } from 'lucide-react'
import { Avatar, Button, SegmentedControl } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import { GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import {
  buildScorecardDetail,
  gradeLabel,
  OVERALL_GRADE_CRITERIA,
  SCORECARD_STATUS_LABEL,
  type ScorecardGoalRow,
} from '@/lib/reviews/scorecards'
import { reviewsTabPath } from '@/lib/reviews/paths'
import type { GradeBandId } from '@/lib/reviews/types'
import { useAuth } from '@/lib/auth'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

type GoalsTab = 'performance' | 'organisational'
type ScopeFilter = 'all' | 'lm'

const GOALS_TABS: { id: GoalsTab; label: string }[] = [
  { id: 'performance', label: 'Performance Goals' },
  { id: 'organisational', label: 'Organisational Goals' },
]

const SCOPE_OPTIONS: { id: ScopeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lm', label: 'LM' },
]

export default function ScorecardDetailPage() {
  const { cycleKey = '', employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const { user } = useAuth()
  const { employees, isLoading } = useEmployees()

  const detail = useMemo(() => {
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return buildScorecardDetail(cycleKey, employeeId, employees, user?.email)
  }, [cycleKey, employeeId, employees, user?.email])

  const [scope, setScope] = useState<ScopeFilter>('all')
  const [goalsTab, setGoalsTab] = useState<GoalsTab>('performance')
  const [contributionOverride, setContributionOverride] =
    useState<GradeBandId | null>(null)
  const [overallOverride, setOverallOverride] = useState<GradeBandId | null>(
    null,
  )

  // Remount-safe: clear local edits when opening a different scorecard.
  useEffect(() => {
    setContributionOverride(null)
    setOverallOverride(null)
    setGoalsTab('performance')
    setScope('all')
  }, [cycleKey, employeeId])

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to={reviewsTabPath('scorecards')} replace />
  }

  if (!detail) {
    if (isLoading) {
      return (
        <div className="pd-page pd-reviews" aria-busy="true">
          <p className="pd-people__empty">Loading scorecard…</p>
        </div>
      )
    }
    return <Navigate to={reviewsTabPath('scorecards')} replace />
  }

  const contributionGrade =
    contributionOverride ?? detail.contributionGrade
  const overallGrade = overallOverride ?? detail.overallGrade
  const goals =
    goalsTab === 'performance'
      ? detail.performanceGoals
      : detail.organisationalGoals

  const statusLabel =
    detail.status === 'completed'
      ? 'Completed review'
      : SCORECARD_STATUS_LABEL[detail.status]

  return (
    <div
      className="pd-page pd-reviews pd-reviews-scorecard"
      aria-label={`${detail.employeeName} scorecard`}
    >
      <header className="pd-reviews-scorecard__hero">
        <div className="pd-reviews-scorecard__hero-top">
          <div className="pd-reviews-scorecard__identity">
            <Avatar
              name={detail.employeeName}
              src={detail.employeeAvatarUrl || undefined}
              size="lg"
              style={avatarStyle(detail.employeeName)}
            />
            <div className="pd-reviews-scorecard__identity-text">
              <div className="pd-reviews-scorecard__name-row">
                <h1>{detail.employeeName}</h1>
                <span
                  className={[
                    'pd-reviews-score-status',
                    detail.status === 'completed'
                      ? 'pd-reviews-score-status--completed'
                      : detail.status === 'in_progress'
                        ? 'pd-reviews-score-status--progress'
                        : 'pd-reviews-score-status--pending',
                  ].join(' ')}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="pd-reviews-scorecard__meta">
                {detail.cycleLabel} Performance Review (LM)
                <span aria-hidden> | </span>
                {detail.role}
                <span aria-hidden> | </span>
                {detail.department}
              </p>
            </div>
          </div>
          <Button variant="secondary" pill className="pd-reviews-scorecard__export">
            <Download size={16} strokeWidth={1.75} aria-hidden />
            Export PDF
          </Button>
        </div>

        <SegmentedControl
          className="pd-people__scope pd-reviews-scorecard__scope"
          buttonClassName="pd-people__scope-btn"
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={setScope}
          aria-label="Review scope"
        />
      </header>

      <section className="pd-reviews-scorecard__card" aria-label="Goals">
        <header className="pd-reviews-scorecard__card-head">
          <h2 className="pd-reviews-scorecard__section-title">
            <Target size={18} strokeWidth={1.75} aria-hidden />
            Goals — {detail.goalsOverallPercent}%
          </h2>
          <span
            className={[
              'pd-reviews-scorecard__band',
              `pd-reviews-scorecard__band--${contributionGrade}`,
            ].join(' ')}
          >
            {gradeLabel(contributionGrade)}
          </span>
        </header>

        <SegmentedControl
          className="pd-people__scope pd-reviews-scorecard__tabs"
          buttonClassName="pd-people__scope-btn"
          options={GOALS_TABS}
          value={goalsTab}
          onChange={setGoalsTab}
          aria-label="Goal type"
        />

        <div
          className="pd-people__panel pd-people__panel--table pd-reviews-scorecard__goals-table-panel"
          aria-labelledby="scorecard-goals-heading"
        >
          <h3 id="scorecard-goals-heading" className="pd-sr-only">
            {goalsTab === 'performance'
              ? 'Performance goals'
              : 'Organisational goals'}
          </h3>
          <div className="pd-people__table-wrap">
            <table className="pd-people__table pd-reviews-scorecard__goals-table">
              <thead>
                <tr>
                  <th>
                    <span className="pd-people__th">
                      Goals
                      <span className="pd-people__th-count">
                        · {goals.length}
                      </span>
                    </span>
                  </th>
                  <th>Weight</th>
                  <th>Owner</th>
                  <th>Progress</th>
                  <th>Metric</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    avatarUrl={detail.employeeAvatarUrl}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pd-reviews-scorecard__card pd-reviews-scorecard__contribution-card">
        <h3 className="pd-reviews-scorecard__section-title">
          <TrendingUp size={16} strokeWidth={1.75} aria-hidden />
          Contribution and Impact
        </h3>
        <div
          className="pd-reviews-scorecard__bands"
          role="listbox"
          aria-label="Contribution and Impact"
        >
          {GRADE_BAND_ORDER.map((band) => (
            <button
              key={band}
              type="button"
              role="option"
              aria-selected={contributionGrade === band}
              className={[
                'pd-reviews-scorecard__band-option',
                contributionGrade === band ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setContributionOverride(band)}
            >
              {gradeLabel(band)}
            </button>
          ))}
        </div>
      </section>

      <section className="pd-reviews-scorecard__card">
        <h2 className="pd-reviews-scorecard__section-title">
          <Trophy size={18} strokeWidth={1.75} aria-hidden />
          Overall Grade
        </h2>
        <div
          className="pd-reviews-scorecard__overall"
          role="radiogroup"
          aria-label="Overall grade"
        >
          {GRADE_BAND_ORDER.map((band) => {
            const selected = overallGrade === band
            return (
              <button
                key={band}
                type="button"
                role="radio"
                aria-checked={selected}
                className={[
                  'pd-reviews-scorecard__overall-option',
                  selected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setOverallOverride(band)}
              >
                <span
                  className="pd-reviews-scorecard__overall-radio"
                  aria-hidden
                />
                <span className="pd-reviews-scorecard__overall-text">
                  <span className="pd-reviews-scorecard__overall-label">
                    {gradeLabel(band)}
                  </span>
                  <ul>
                    {OVERALL_GRADE_CRITERIA[band].map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="pd-reviews-scorecard__card">
        <header className="pd-reviews-scorecard__feedback-head">
          <h2 className="pd-reviews-scorecard__section-title">
            <Star size={18} strokeWidth={1.75} aria-hidden />
            Feedback
          </h2>
          <div className="pd-reviews-scorecard__feedback-author">
            <Avatar
              name={detail.feedback.authorName}
              src={detail.reviewerAvatarUrl || undefined}
              size="sm"
              className="pd-people__avatar"
              style={avatarStyle(detail.feedback.authorName)}
            />
            <p>
              <span className="pd-reviews-scorecard__feedback-author-name">
                {detail.feedback.authorName}
              </span>
              <span aria-hidden> — </span>
              {detail.feedback.authorRole}
              <span aria-hidden> — </span>
              {detail.feedback.dateLabel}
            </p>
          </div>
        </header>
        <div className="pd-reviews-scorecard__feedback-grid">
          <div>
            <h3>Strengths</h3>
            <ul>
              {detail.feedback.strengths.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Areas of development</h3>
            <ul>
              {detail.feedback.developments.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="pd-reviews-scorecard__back">
          <Link to={reviewsTabPath('scorecards')}>Back to Scorecards</Link>
        </p>
      </section>
    </div>
  )
}

function PersonCell({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string
}) {
  return (
    <div className="pd-people__person">
      <Avatar
        name={name}
        src={avatarUrl || undefined}
        size="sm"
        className="pd-people__avatar"
        style={avatarStyle(name)}
      />
      <span className="pd-people__person-name">{name}</span>
    </div>
  )
}

function GoalRow({
  goal,
  avatarUrl,
}: {
  goal: ScorecardGoalRow
  avatarUrl?: string
}) {
  return (
    <tr>
      <td>{goal.description}</td>
      <td className="pd-people__id">{goal.weight}%</td>
      <td>
        <PersonCell name={goal.ownerName} avatarUrl={avatarUrl} />
      </td>
      <td>
        <span
          className={
            goal.progressPercent >= 100
              ? 'pd-reviews-scorecard__progress is-good'
              : 'pd-reviews-scorecard__progress'
          }
        >
          {goal.progressPercent}%
        </span>
      </td>
      <td>{goal.metricLabel}</td>
    </tr>
  )
}
