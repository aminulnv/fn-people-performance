import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Columns3,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Target,
  Users,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Progress,
  SegmentedControl,
  Textarea,
} from '@/components/ui'
import {
  canSubmitGoals,
  fetchGoalsSnapshot,
  goalCompletion,
  isEligibleForCycle,
  overallCompletion,
  sumGoalWeights,
  watchGoalsSnapshot,
  type DemoPhase,
  type Goal,
  type GoalsSnapshot,
  type PersonGoals,
} from '@/lib/goalsApi'
import { blankGoal } from '@/lib/goals/measurements'
import type { GoalOwnerOption } from '@/lib/goals/operations'
import type { GoalCapabilities } from '@/lib/goals/permissions'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { getEmployee } from '@/lib/employees/store'
import {
  setActiveCycle,
} from '@/lib/goals/store'
import { DEMO_PHASES } from '@/lib/goals/phases'
import { GoalUnifiedDetail } from './goals-v2/GoalUnifiedDetail'
import {
  goalsV2DetailPath,
  goalsV2GoalPath,
  goalsV2OverviewPath,
} from './goals-v2/paths'
import { GoalsCycleSelect } from './goals/GoalsCycleSelect'
import {
  useGoalsController,
  subjectIsEligible,
} from './goals/useGoalsController'
import {
  goalTitle,
  goalSectionLabels,
  metricCountLabel,
  metricSummary,
  personMatchesScope,
  trackLabel,
  type GoalsDirectoryScope,
} from './goals/goalHelpers'
import { statusLabel, statusVariant } from './goals/statusLabels'
import { reviewsTabPath } from '@/lib/reviews/paths'
import '@/styles/layout-people.css'
import '@/styles/layout-goals.css'
import '@/styles/layout-goals-v2.css'

function phaseLabel(phase: DemoPhase): string {
  return DEMO_PHASES.find((p) => p.id === phase)?.label ?? phase
}

/** Role line under the name — mirrors the employee profile hero. */
function personMeta(person: GoalsSnapshot['people'][number]): string {
  const division = getEmployee(Number(person.id))?.division
  return [person.title, person.department, division].filter(Boolean).join(' · ')
}

function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'ok' | 'danger'
  children: ReactNode
}) {
  const mod =
    tone === 'neutral' ? '' : ` pd-goals__notice--${tone === 'ok' ? 'ok' : tone}`
  return <p className={`pd-goals__notice${mod}`}>{children}</p>
}

type ManagerTab = 'mine' | 'team'

const SCOPES: { id: GoalsDirectoryScope; label: string }[] = [
  { id: 'mine', label: 'My Goals' },
  { id: 'all', label: 'Everyone' },
  { id: 'reports', label: 'My Reports' },
  { id: 'department', label: 'My Department' },
]

type GoalsListFilter =
  | 'all'
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'incomplete'

/** One row per goal — a person with three goals appears on three rows. */
type GoalRow = {
  key: string
  person: GoalsSnapshot['people'][number]
  status: PersonGoals['status']
  title: string
  hasGoal: boolean
  goalId?: string
  weight: number
  completion: number
  metric: string
  progressStatus?: Goal['progressStatus']
}

export default function GoalsV2Page() {
  const { cycleId, personId, goalId } = useParams()

  if (cycleId && personId) {
    return (
      <GoalsPersonDetail
        cycleId={cycleId}
        personId={personId}
        goalId={goalId}
      />
    )
  }

  return <GoalsOverview />
}

function GoalsOverview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<GoalsSnapshot | null>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<GoalsDirectoryScope>('mine')
  const [statusFilter, setStatusFilter] = useState<GoalsListFilter>('all')

  useEffect(() => {
    let isMounted = true
    void fetchGoalsSnapshot().then((next) => {
      if (isMounted) setSnapshot(next)
    })
    const unsubscribe = watchGoalsSnapshot(() => {
      void fetchGoalsSnapshot().then((next) => {
        if (isMounted) setSnapshot(next)
      })
    })
    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const rows = useMemo<GoalRow[]>(() => {
    if (!snapshot) return []
    return snapshot.people.flatMap((person): GoalRow[] => {
      const personGoals = snapshot.byPerson[person.id]
      const status = personGoals?.status ?? 'draft'
      const goals = personGoals?.goals ?? []
      if (goals.length === 0) {
        return [
          {
            key: person.id,
            person,
            status,
            title: 'No goals set',
            hasGoal: false,
            weight: 0,
            completion: 0,
            metric: '—',
          },
        ]
      }
      return goals.map((goal, index) => ({
        key: `${person.id}:${goal.id}`,
        person,
        status,
        title: goalTitle(goal, index),
        hasGoal: true,
        goalId: goal.id,
        weight: goal.weight,
        completion: Math.round(goalCompletion(goal)),
        metric: metricCountLabel(goal),
        progressStatus: goal.progressStatus,
      }))
    })
  }, [snapshot])

  const me = useMemo(() => {
    if (!snapshot) return null
    const email = user?.email?.trim().toLowerCase()
    const personId = user?.personId
    return (
      snapshot.people.find((person) => {
        if (email && person.email.trim().toLowerCase() === email) return true
        if (personId && personId !== 'local' && person.id === personId) {
          return true
        }
        return false
      }) ?? null
    )
  }, [snapshot, user?.email, user?.personId])

  const scopedRows = useMemo(
    () => rows.filter((row) => personMatchesScope(row.person, scope, me)),
    [me, rows, scope],
  )

  const counts = useMemo(() => {
    const result = {
      all: scopedRows.length,
      draft: 0,
      submitted: 0,
      approved: 0,
      incomplete: 0,
    }
    for (const row of scopedRows) {
      if (row.status === 'draft' || row.status === 'sent_back') {
        result.draft += 1
      } else if (row.status === 'submitted') {
        result.submitted += 1
      } else if (row.status === 'approved') {
        result.approved += 1
      } else if (row.status === 'incomplete' || row.status === 'not_eligible') {
        result.incomplete += 1
      }
    }
    return result
  }, [scopedRows])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return scopedRows
      .filter((row) => {
        if (statusFilter !== 'all') {
          const isDraftGroup =
            statusFilter === 'draft' &&
            (row.status === 'draft' || row.status === 'sent_back')
          const isIncompleteGroup =
            statusFilter === 'incomplete' &&
            (row.status === 'incomplete' || row.status === 'not_eligible')
          if (
            !isDraftGroup &&
            !isIncompleteGroup &&
            row.status !== statusFilter
          ) {
            return false
          }
        }
        if (!normalizedQuery) return true
        return [
          row.title,
          row.person.name,
          row.person.title,
          row.person.department,
          statusLabel(row.status),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => {
        const aDept = a.person.department.trim()
        const bDept = b.person.department.trim()
        const aBlank = aDept === ''
        const bBlank = bDept === ''
        if (aBlank !== bBlank) return aBlank ? 1 : -1
        const byDept = aDept.localeCompare(bDept, undefined, {
          sensitivity: 'base',
        })
        if (byDept !== 0) return byDept
        const byName = a.person.name.localeCompare(b.person.name, undefined, {
          sensitivity: 'base',
        })
        if (byName !== 0) return byName
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: 'base',
        })
      })
  }, [query, scopedRows, statusFilter])

  if (!snapshot) {
    return <div className="pd-page pd-goals" aria-busy="true" aria-label="Goals" />
  }

  const summaryItems: {
    id: GoalsListFilter
    label: string
    value: number
  }[] = [
    { id: 'all', label: 'Goals', value: counts.all },
    { id: 'draft', label: 'Draft', value: counts.draft },
    { id: 'submitted', label: 'Pending Approval', value: counts.submitted },
    { id: 'approved', label: 'Approved', value: counts.approved },
    { id: 'incomplete', label: 'Incomplete', value: counts.incomplete },
  ]

  return (
    <div className="pd-page pd-goals pd-goals-overview" aria-label="Goals">
      <div
        className="pd-people__summary"
        role="group"
        aria-label="Goal submission totals"
      >
        {summaryItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              'pd-people__summary-btn',
              statusFilter === item.id ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={statusFilter === item.id}
            onClick={() => setStatusFilter(item.id)}
          >
            <span className="pd-people__summary-value">{item.value}</span>
            <span className="pd-people__summary-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <label className="pd-people__search pd-goals-overview__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search goals</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, teams or departments…"
              className="pd-people__search-input"
            />
          </label>
          {me ? (
            <SegmentedControl
              className="pd-people__scope"
              buttonClassName="pd-people__scope-btn"
              options={SCOPES}
              value={scope}
              onChange={setScope}
              aria-label="Goals scope"
            />
          ) : null}
          <GoalsCycleSelect
            cycles={snapshot.availableCycles}
            activeCycleId={snapshot.cycle.id}
          />
        </div>

        <div className="pd-people__toolbar">
          <button
            type="button"
            className="pd-people__icon-btn"
            aria-label="More actions"
            title="More actions"
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" className="pd-people__ghost-btn">
            <Columns3 size={16} strokeWidth={1.75} aria-hidden />
            Column Settings
          </button>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="goals-people-heading"
      >
        <h2 id="goals-people-heading" className="pd-sr-only">
          {scope === 'mine'
            ? 'My goals'
            : scope === 'reports'
              ? "My Reports' goals"
              : scope === 'department'
                ? "My department's goals"
                : "Everyone's goals"}
        </h2>
        {filtered.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-empty--inline"
              icon={Target}
              title={
                rows.length === 0
                  ? 'No goals yet'
                  : scopedRows.length === 0
                    ? 'No people in this scope'
                    : 'No matches'
              }
              description={
                rows.length === 0
                  ? 'Add people to the directory to start setting goals.'
                  : scopedRows.length === 0
                    ? 'Try Everyone to see the full list, or pick a different scope.'
                    : 'Try a different search or status filter.'
              }
              action={
                scopedRows.length === 0 && rows.length > 0 ? (
                  <button
                    type="button"
                    className="pd-people__create-btn"
                    onClick={() => setScope('all')}
                  >
                    Show Everyone
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            <table className="pd-people__table pd-goals-overview__table">
              <thead>
                <tr>
                  <th>
                    Goals
                    <span className="pd-people__th-count">
                      · {filtered.length}
                    </span>
                  </th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Weight</th>
                  <th>Progress</th>
                  <th>Metric</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const personTo = goalsV2DetailPath(
                    snapshot.cycle.id,
                    row.person.id,
                  )
                  const to = row.goalId
                    ? goalsV2GoalPath(
                        snapshot.cycle.id,
                        row.person.id,
                        row.goalId,
                      )
                    : personTo
                  const track = trackLabel(
                    row.status,
                    row.completion,
                    row.progressStatus,
                  )
                  return (
                    <tr
                      key={row.key}
                      className="pd-goals-overview__row"
                      tabIndex={0}
                      onClick={(event) => {
                        const target = event.target as HTMLElement
                        if (target.closest('a, button')) return
                        navigate(to)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        navigate(to)
                      }}
                    >
                      <td>
                        <Link
                          to={to}
                          className={[
                            'pd-goals-overview__goal',
                            row.hasGoal ? '' : 'pd-goals-overview__muted',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          title={row.title}
                        >
                          <span className="pd-goals-overview__goal-dot" aria-hidden />
                          {row.title}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={personTo}
                          className="pd-people__person pd-people__person-link"
                          title={`Open ${row.person.name}'s goals`}
                        >
                          <Avatar
                            name={row.person.name}
                            src={row.person.avatarUrl}
                            size="sm"
                            className="pd-people__avatar"
                            style={avatarStyle(row.person.name)}
                          />
                          <span className="pd-people__person-name">
                            {row.person.name}
                          </span>
                        </Link>
                      </td>
                      <td>{row.person.department.trim() || '—'}</td>
                      <td>
                        <span className="pd-goals-overview__weight">
                          {row.weight}%
                        </span>
                      </td>
                      <td>
                        <div className="pd-goals-overview__progress">
                          <span className="pd-goals-overview__progress-label">
                            {row.completion}%
                          </span>
                          <Progress value={row.completion} />
                        </div>
                      </td>
                      <td className="pd-goals-overview__muted">{row.metric}</td>
                      <td>
                        <div className="pd-people__person">
                          <Avatar
                            name={row.person.name}
                            src={row.person.avatarUrl}
                            size="sm"
                            className="pd-people__avatar"
                            style={avatarStyle(row.person.name)}
                          />
                          <span className="pd-people__person-name">
                            {row.person.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`pd-goals-overview__track pd-goals-overview__track--${track.tone}`}
                        >
                          {track.label}
                        </span>
                      </td>
                      <td>
                        {row.status === 'approved' ? (
                          <span
                            className="pd-goals-overview__check"
                            aria-label="Approved"
                          >
                            <Check size={14} strokeWidth={2.5} aria-hidden />
                          </span>
                        ) : row.status === 'submitted' ? (
                          <Badge variant="pending">Pending</Badge>
                        ) : (
                          <span className="pd-goals-overview__muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function GoalsPersonDetail({
  cycleId,
  personId,
  goalId,
}: {
  cycleId: string
  personId: string
  goalId?: string
}) {
  const navigate = useNavigate()
  const {
    snapshot,
    actor,
    subject: active,
    subjectGoals: activeGoals,
    reports,
    ownerOptions,
    capabilities,
    capabilitiesFor,
    resolveOwner,
    busy,
    error,
    actions,
  } = useGoalsController({ cycleId, subjectId: personId })
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [sendBackReason, setSendBackReason] = useState('')
  const [ratingTier, setRatingTier] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [ratingComment, setRatingComment] = useState('')
  const [managerTab, setManagerTab] = useState<ManagerTab>('mine')
  const [teamDetailOpen, setTeamDetailOpen] = useState(false)

  /** The Reports section belongs to the profile owner, so it follows them. */
  const hasReports = Boolean(active && active.reportIds.length > 0)
  const isPeopleOps = actor?.role === 'ptr' || actor?.role === 'hrbp'
  const sectionLabels = goalSectionLabels(
    active?.name ?? 'Goals',
    Boolean(actor && active && actor.id === active.id),
  )

  const selectedReview = useMemo(() => {
    if (!snapshot || !reviewId) return null
    const person = snapshot.people.find((p) => p.id === reviewId)
    const row = snapshot.byPerson[reviewId]
    if (!person || !row) return null
    return { person, row }
  }, [snapshot, reviewId])

  if (!snapshot) {
    return <div className="pd-page pd-goals" aria-busy="true" aria-label="Goals" />
  }

  const cycleToolbar = (
    <div className="pd-goals-shell__top">
      <GoalsCycleSelect
        cycles={snapshot.availableCycles}
        activeCycleId={snapshot.cycle.id}
        onSelect={(nextCycleId) => {
          setActiveCycle(nextCycleId)
          navigate(goalsV2DetailPath(nextCycleId, personId))
        }}
      />
    </div>
  )

  if (snapshot.availableCycles.length === 0) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <PageHeader
          title="Goals"
          description="Select a review cycle to set goals under it."
        />
        <EmptyState
          icon={Target}
          title="No goal cycles yet"
          description="Review cycles are also goal cycles. Add a cycle in Reviews, then come back to set goals."
          action={
            <Link to={reviewsTabPath('cycles')} className="pd-people__create-btn">
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Review Cycle
            </Link>
          }
        />
      </div>
    )
  }

  if (!active || !activeGoals) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <PageHeader
          title="Goals"
          description={`${snapshot.cycle.label} · ${phaseLabel(snapshot.cycle.phase)}`}
        />
        {cycleToolbar}
        <EmptyState
          icon={Users}
          title="No people yet"
          description="Add employees in People to start setting and reviewing goals."
          action={
            <Link to="/people/new" className="pd-people__create-btn">
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Employee
            </Link>
          }
        />
      </div>
    )
  }

  const eligible = subjectIsEligible(active, snapshot)
  const weightTotal = sumGoalWeights(activeGoals.goals)
  const completion = Math.round(overallCompletion(activeGoals.goals))
  const canEditDraft = Boolean(capabilities?.canEditStructure)
  const canUpdateProgress = Boolean(capabilities?.canUpdateProgress)
  const pendingCount = reports.filter((r) => r.row.status === 'submitted').length
  const isCurrentCycle = snapshot.cycleStatus === 'current'
  const showsReports = hasReports && managerTab === 'team'
  const detailOpen = Boolean(goalId) || teamDetailOpen

  const managerTabs = (
    <SegmentedControl
      className="pd-people__scope pd-goals__tabs"
      buttonClassName="pd-people__scope-btn"
      options={[
        { id: 'mine', label: sectionLabels.goals },
        {
          id: 'team',
          label: (
            <>
              {sectionLabels.reports}
              {pendingCount > 0 ? (
                <span
                  className="pd-segmented__badge"
                  aria-label={`${pendingCount} awaiting review`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </>
          ),
        },
      ]}
      value={managerTab}
      onChange={(tab) => {
        setManagerTab(tab)
        setTeamDetailOpen(false)
        if (goalId) navigate(goalsV2DetailPath(cycleId, personId))
      }}
      aria-label="Goal sections"
    />
  )

  const openGoal = (nextGoalId: string | null) => {
    if (nextGoalId) {
      navigate(goalsV2GoalPath(cycleId, personId, nextGoalId))
      return
    }
    navigate(goalsV2DetailPath(cycleId, personId))
  }

  const cycleSelect = (
    <GoalsCycleSelect
      cycles={snapshot.availableCycles}
      activeCycleId={snapshot.cycle.id}
      onSelect={(nextCycleId) => {
        setActiveCycle(nextCycleId)
        navigate(goalsV2DetailPath(nextCycleId, personId))
      }}
    />
  )

  const myGoalsPanel = (
    <EmployeePanel
      personName={active.name}
      personId={active.id}
      cycleLabel={snapshot.cycle.label}
      isCurrentCycle={isCurrentCycle}
      row={activeGoals}
      eligible={eligible}
      canEditDraft={canEditDraft}
      canUpdateProgress={canUpdateProgress}
      canDuplicate={Boolean(capabilities?.canDuplicate)}
      canCascade={Boolean(capabilities?.canCascade)}
      canSubmit={Boolean(capabilities?.canSubmit)}
      showOwnScore={Boolean(activeGoals.rating)}
      busy={busy}
      openGoalId={goalId}
      commentAuthorName={actor?.name ?? active.name}
      toolbarStart={
        detailOpen ? undefined : (
          <div className="pd-goals-toolbar__start">
            {cycleSelect}
            {hasReports ? managerTabs : null}
          </div>
        )
      }
      toolbarOnly={showsReports}
      ownerOptions={ownerOptions}
      resolveOwner={(goal) =>
        resolveOwner(goal, active.id) ?? {
          id: active.id,
          name: active.name,
          avatarUrl: active.avatarUrl,
        }
      }
      onOpenGoal={openGoal}
      onPersistGoals={(goals) => {
        void actions.saveGoals(active.id, goals)
      }}
      onPersistProgress={(goals) => {
        void actions.saveProgress(active.id, goals)
      }}
      onDuplicateGoal={(goalId) => actions.duplicateGoal(active.id, goalId)}
      onCascadeGoal={(goalId) => actions.cascadeGoal(active.id, goalId)}
      onSubmit={(goals) => void actions.saveAndSubmit(active.id, goals)}
    />
  )

  return (
    <div className="pd-page pd-goals" aria-label={`${active.name} goals`}>
      {!detailOpen ? (
        <header className="pd-goals-detail-header">
          <Link
            to={goalsV2OverviewPath()}
            className="pd-people__back pd-people__back--toolbar"
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
            Back to All Goals
          </Link>
          <section className="pd-profile__hero pd-goals-detail-header__hero">
            <div className="pd-profile__hero-main">
              <Avatar
                name={active.name}
                src={active.avatarUrl || undefined}
                size="lg"
                className="pd-profile__hero-avatar"
                style={avatarStyle(active.name)}
              />
              <div className="pd-profile__hero-text">
                <h1 className="pd-profile__name">{active.name}</h1>
                <p className="pd-profile__hero-meta">
                  {personMeta(active) || phaseLabel(snapshot.cycle.phase)}
                </p>
              </div>
            </div>
          </section>
          <div
            className="pd-people__summary pd-goals-detail-header__summary"
            role="group"
            aria-label={`${active.name} goal totals`}
          >
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-value">
                {statusLabel(activeGoals.status)}
              </span>
              <span className="pd-people__summary-label">Status</span>
            </div>
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-value">
                {activeGoals.goals.length}
              </span>
              <span className="pd-people__summary-label">Goals</span>
            </div>
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-value">{weightTotal}%</span>
              <span className="pd-people__summary-label">Goal weight</span>
            </div>
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-value">{completion}%</span>
              <span className="pd-people__summary-label">Completion</span>
            </div>
          </div>
        </header>
      ) : null}

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {isPeopleOps && !detailOpen ? <PtrOverview snapshot={snapshot} /> : null}

      {myGoalsPanel}

      {showsReports ? (
        <ManagerPanel
          snapshot={snapshot}
          reports={reports}
          selected={selectedReview}
          ownerOptions={ownerOptions}
          commentAuthorName={actor?.name ?? ''}
          capabilitiesFor={capabilitiesFor}
          resolveOwner={resolveOwner}
          sendBackReason={sendBackReason}
          onSendBackReason={setSendBackReason}
          ratingTier={ratingTier}
          ratingComment={ratingComment}
          onRatingTier={setRatingTier}
          onRatingComment={setRatingComment}
          busy={busy}
          onDetailOpenChange={setTeamDetailOpen}
          onSelect={setReviewId}
          onSaveGoals={(id, goals) => void actions.saveGoals(id, goals)}
          onSaveProgress={(id, goals) => void actions.saveProgress(id, goals)}
          onApprove={(id, goals) => void actions.approve(id, goals)}
          onSendBack={(id) =>
            void actions.sendBack(id, sendBackReason).then(() => {
              setSendBackReason('')
            })
          }
          onRate={(id) =>
            void actions
              .rate(id, {
                tier: ratingTier,
                comment: ratingComment,
              })
              .then(() => {
                setRatingComment('')
              })
          }
        />
      ) : null}
    </div>
  )
}

function PtrOverview({ snapshot }: { snapshot: GoalsSnapshot }) {
  return (
    <Card
      title="People in this cycle"
      description="Eligibility and submission status across the org."
    >
      <div className="pd-goals-people-table">
        {snapshot.people
          .filter(
            (p) =>
              p.role === 'employee' ||
              p.role === 'manager' ||
              p.role === 'seniormanager',
          )
          .map((person) => {
            const row = snapshot.byPerson[person.id]
            const eligible = isEligibleForCycle(person, snapshot.cycle)
            return (
              <div key={person.id} className="pd-goals-people-table__row">
                <div>
                  <div className="pd-goals-people-table__name">{person.name}</div>
                  <div className="pd-goals-people-table__meta">{person.title}</div>
                </div>
                <div className="pd-goals-people-table__meta">
                  Joined {person.joinDate}
                  {eligible ? '' : ' · after Day 1'}
                </div>
                <Badge variant={statusVariant(row?.status ?? 'draft')}>
                  {statusLabel(row?.status ?? 'draft')}
                </Badge>
              </div>
            )
          })}
      </div>
    </Card>
  )
}

function ManagerPanel({
  snapshot,
  reports,
  selected,
  ownerOptions,
  commentAuthorName,
  capabilitiesFor,
  resolveOwner,
  sendBackReason,
  onSendBackReason,
  ratingTier,
  ratingComment,
  onRatingTier,
  onRatingComment,
  busy,
  onSelect,
  onApprove,
  onSendBack,
  onRate,
  onSaveGoals,
  onSaveProgress,
  onDetailOpenChange,
}: {
  snapshot: GoalsSnapshot
  reports: { person: GoalsSnapshot['people'][number]; row: PersonGoals }[]
  selected: { person: GoalsSnapshot['people'][number]; row: PersonGoals } | null
  ownerOptions: GoalOwnerOption[]
  commentAuthorName: string
  capabilitiesFor: (subjectId: string) => GoalCapabilities | null
  resolveOwner: (
    goal: Goal,
    subjectId: string,
  ) => { id: string; name: string; title?: string; avatarUrl?: string } | null
  sendBackReason: string
  onSendBackReason: (v: string) => void
  ratingTier: 1 | 2 | 3 | 4 | 5
  ratingComment: string
  onRatingTier: (v: 1 | 2 | 3 | 4 | 5) => void
  onRatingComment: (v: string) => void
  busy: boolean
  onSelect: (id: string) => void
  onApprove: (id: string, goals: Goal[]) => void
  onSendBack: (id: string) => void
  onRate: (id: string) => void
  onSaveGoals: (id: string, goals: Goal[]) => void
  onSaveProgress: (id: string, goals: Goal[]) => void
  onDetailOpenChange?: (open: boolean) => void
}) {
  const queue = reports

  const active =
    (selected && queue.find((r) => r.person.id === selected.person.id)) ||
    queue[0] ||
    null

  const [openGoalId, setOpenGoalId] = useState<string | null>(null)

  useEffect(() => {
    setOpenGoalId(null)
  }, [active?.person.id])

  useEffect(() => {
    onDetailOpenChange?.(Boolean(openGoalId))
  }, [openGoalId, onDetailOpenChange])

  if (queue.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No direct reports"
        description="People who report to you will show up here with their goals."
      />
    )
  }

  const goals = active?.row.goals ?? []
  const selectedIndex = openGoalId
    ? goals.findIndex((g) => g.id === openGoalId)
    : -1
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null
  const caps = active ? capabilitiesFor(active.person.id) : null

  return (
    <div className="pd-goals-team">
      <div className="pd-goals-team__list" role="list">
        {queue.map(({ person, row }) => (
          <button
            key={person.id}
            type="button"
            className={`pd-goals-team__row${
              active?.person.id === person.id ? ' is-active' : ''
            }`}
            onClick={() => onSelect(person.id)}
          >
            <Avatar
              name={person.name}
              src={person.avatarUrl || undefined}
              size="sm"
            />
            <span className="pd-goals-team__row-text">
              <span className="pd-goals-team__name">{person.name}</span>
              <span className="pd-goals-team__sub">
                {row.status === 'submitted'
                  ? `${row.goals.length} goals · pending`
                  : row.rating
                    ? `Rated ${row.rating.tier}/5`
                    : `${Math.round(overallCompletion(row.goals))}% complete`}
              </span>
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <div className="pd-goals-team__detail">
          {!selectedGoal ? (
            <div className="pd-goals-team__detail-head">
              <div>
                <h3>{active.person.name}</h3>
                <p className="pd-goals-team__title">{active.person.title}</p>
              </div>
              <Badge variant={statusVariant(active.row.status)}>
                {statusLabel(active.row.status)}
              </Badge>
            </div>
          ) : null}

          {selectedGoal ? (
            <GoalUnifiedDetail
              goal={selectedGoal}
              index={selectedIndex}
              total={goals.length}
              owner={
                resolveOwner(selectedGoal, active.person.id) ?? {
                  name: active.person.name,
                  avatarUrl: active.person.avatarUrl,
                }
              }
              defaultOwnerId={active.person.id}
              ownerOptions={ownerOptions}
              cycleLabel={snapshot.cycle.label}
              isCurrentCycle={snapshot.cycleStatus === 'current'}
              status={active.row.status}
              commentAuthorName={commentAuthorName}
              canEdit={Boolean(caps?.canEditStructure)}
              canUpdateProgress={Boolean(caps?.canUpdateProgress)}
              canRemove={Boolean(caps?.canEditStructure)}
              onSave={(goal) => {
                onSaveGoals(
                  active.person.id,
                  goals.map((item) => (item.id === goal.id ? goal : item)),
                )
              }}
              onProgressChange={(goal) => {
                onSaveProgress(
                  active.person.id,
                  goals.map((item) => (item.id === goal.id ? goal : item)),
                )
              }}
              onRemove={
                caps?.canEditStructure
                  ? () => {
                      onSaveGoals(
                        active.person.id,
                        goals.filter((item) => item.id !== selectedGoal.id),
                      )
                      setOpenGoalId(null)
                    }
                  : undefined
              }
              onBack={() => setOpenGoalId(null)}
              onSelectIndex={(nextIndex) => {
                const next = goals[nextIndex]
                if (next) setOpenGoalId(next.id)
              }}
            />
          ) : (
            <GoalsTable
              goals={goals}
              status={active.row.status}
              onOpen={setOpenGoalId}
            />
          )}

          {!selectedGoal && (caps?.canApprove || caps?.canSendBack) ? (
            <div className="pd-goals-rate">
              <Textarea
                label="Send back reason"
                value={sendBackReason}
                onChange={(e) => onSendBackReason(e.target.value)}
                placeholder="Required only if you send back"
                rows={2}
              />
              <div className="pd-goals__footer-actions">
                {caps?.canApprove ? (
                  <button
                    type="button"
                    className="pd-people__ghost-btn pd-people__ghost-btn--success"
                    disabled={busy}
                    onClick={() => onApprove(active.person.id, active.row.goals)}
                  >
                    <Check size={16} strokeWidth={1.75} aria-hidden />
                    Approve
                  </button>
                ) : null}
                {caps?.canSendBack ? (
                  <button
                    type="button"
                    className="pd-people__ghost-btn"
                    disabled={busy || !sendBackReason.trim()}
                    onClick={() => onSendBack(active.person.id)}
                  >
                    Send Back
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!selectedGoal && caps?.canRate ? (
            <div className="pd-goals-rate">
              <div>
                <p className="pd-goal-aside-row__label">Quarter score</p>
                <p className="pd-goal-aside-row__value">
                  {Math.round(overallCompletion(active.row.goals))}% complete
                </p>
                <div className="pd-goals-rate__tiers" role="group" aria-label="Quarter score">
                  {([1, 2, 3, 4, 5] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      className={[
                        'pd-people__chip',
                        ratingTier === tier ? 'is-active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={ratingTier === tier}
                      onClick={() => onRatingTier(tier)}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                label="Comment"
                value={ratingComment}
                onChange={(e) => onRatingComment(e.target.value)}
                rows={2}
              />
              <Progress value={overallCompletion(active.row.goals)} />
              <div className="pd-goals__footer-actions">
                <button
                  type="button"
                  className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                  disabled={busy}
                  onClick={() => onRate(active.person.id)}
                >
                  <Send size={16} strokeWidth={1.75} aria-hidden />
                  Submit Score
                </button>
              </div>
            </div>
          ) : null}

          {active.row.rating ? (
            <Notice tone="ok">
              Score {active.row.rating.tier}/5 is visible to {active.person.name}.
              {active.row.rating.comment ? ` ${active.row.rating.comment}` : ''}
            </Notice>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function EmployeePanel({
  personName,
  personId,
  cycleLabel,
  isCurrentCycle,
  row,
  eligible,
  canEditDraft,
  canUpdateProgress,
  canDuplicate,
  canCascade,
  canSubmit,
  showOwnScore,
  busy,
  openGoalId,
  commentAuthorName,
  toolbarStart,
  toolbarOnly = false,
  ownerOptions,
  resolveOwner,
  onOpenGoal,
  onPersistGoals,
  onPersistProgress,
  onDuplicateGoal,
  onCascadeGoal,
  onSubmit,
}: {
  personName: string
  personId: string
  cycleLabel: string
  isCurrentCycle: boolean
  row: PersonGoals
  eligible: boolean
  canEditDraft: boolean
  canUpdateProgress: boolean
  canDuplicate: boolean
  canCascade: boolean
  canSubmit: boolean
  showOwnScore: boolean
  busy: boolean
  openGoalId?: string
  commentAuthorName: string
  toolbarStart?: ReactNode
  /**
   * Renders the toolbar row without the goals below it. The panel stays mounted
   * while another section is on screen, so the section tabs inside `toolbarStart`
   * keep their sliding indicator instead of remounting on every switch.
   */
  toolbarOnly?: boolean
  ownerOptions: GoalOwnerOption[]
  resolveOwner: (goal: Goal) => {
    id: string
    name: string
    title?: string
    avatarUrl?: string
  }
  onOpenGoal: (goalId: string | null) => void
  onPersistGoals: (goals: Goal[]) => void
  onPersistProgress: (goals: Goal[]) => void
  onDuplicateGoal: (goalId: string) => Promise<Goal | null>
  onCascadeGoal: (goalId: string) => Promise<void>
  onSubmit: (goals: Goal[]) => void
}) {
  const [goals, setGoals] = useState(row.goals)
  const [creatingIds, setCreatingIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setGoals(row.goals)
    setCreatingIds((prev) => {
      const next = new Set(
        [...prev].filter((id) => row.goals.some((goal) => goal.id === id)),
      )
      return next.size === prev.size ? prev : next
    })
  }, [personId, row.status, row.goals])

  const submitCheck = canSubmitGoals(goals)
  const selectedIndex = openGoalId
    ? goals.findIndex((g) => g.id === openGoalId)
    : -1
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null

  const setLocal = (next: Goal[]) => setGoals(next)
  const setAndPersist = (next: Goal[]) => {
    setGoals(next)
    onPersistGoals(next)
  }

  const addGoal = () => {
    const next = blankGoal({ ownerId: personId, withDefaultMetric: false })
    setCreatingIds((prev) => new Set(prev).add(next.id))
    setLocal([...goals, next])
    onOpenGoal(next.id)
  }

  const ownerFor = (goal: Goal) => resolveOwner(goal)

  if (toolbarOnly && !toolbarStart) return null

  if (!toolbarOnly && (!eligible || row.status === 'not_eligible')) {
    return (
      <>
        {toolbarStart ? (
          <div className="pd-goals-toolbar">{toolbarStart}</div>
        ) : null}
        <EmptyState
          icon={Target}
          title="Not eligible this quarter"
          description={`${personName} joined after Day 1, so goal setting starts next quarter.`}
        />
      </>
    )
  }

  if (!toolbarOnly && row.status === 'incomplete') {
    return (
      <>
        {toolbarStart ? (
          <div className="pd-goals-toolbar">{toolbarStart}</div>
        ) : null}
        <Notice tone="danger">
          No submission by Day 30 — flagged incomplete. Quarter score is 0.
        </Notice>
      </>
    )
  }

  if (!toolbarOnly && selectedGoal) {
    const isNew = creatingIds.has(selectedGoal.id)

    const closeGoal = () => {
      setCreatingIds((prev) => {
        if (!prev.has(selectedGoal.id)) return prev
        const next = new Set(prev)
        next.delete(selectedGoal.id)
        return next
      })
      onOpenGoal(null)
    }

    const replaceGoal = (next: Goal, persist: boolean) => {
      const updated = goals.map((g) => (g.id === selectedGoal.id ? next : g))
      if (persist) setAndPersist(updated)
      else setLocal(updated)
    }

    const clearCreating = () => {
      setCreatingIds((prev) => {
        if (!prev.has(selectedGoal.id)) return prev
        const next = new Set(prev)
        next.delete(selectedGoal.id)
        return next
      })
    }

    return (
      <div className="pd-goals-shell" aria-label="Goal detail">
        <GoalUnifiedDetail
          goal={selectedGoal}
          index={selectedIndex}
          total={goals.length}
          isNew={isNew}
          owner={ownerFor(selectedGoal)}
          defaultOwnerId={personId}
          ownerOptions={ownerOptions}
          cycleLabel={cycleLabel}
          isCurrentCycle={isCurrentCycle}
          status={row.status}
          commentAuthorName={commentAuthorName}
          canEdit={canEditDraft}
          canUpdateProgress={canUpdateProgress}
          canRemove={canEditDraft}
          canCascade={canCascade}
          onBack={closeGoal}
          onDiscardNew={() => {
            setGoals(row.goals)
            clearCreating()
          }}
          onSave={(next) => {
            replaceGoal(next, true)
            clearCreating()
          }}
          onProgressChange={(next) => {
            const updated = goals.map((goal) =>
              goal.id === selectedGoal.id ? next : goal,
            )
            setGoals(updated)
            onPersistProgress(updated)
          }}
          onDuplicate={
            canDuplicate
              ? () => {
                  void onDuplicateGoal(selectedGoal.id).then((copy) => {
                    if (copy) onOpenGoal(copy.id)
                  })
                }
              : undefined
          }
          onCascade={
            canCascade
              ? () => {
                  void onCascadeGoal(selectedGoal.id)
                }
              : undefined
          }
          onSelectIndex={(nextIndex) => {
            const next = goals[nextIndex]
            if (next) onOpenGoal(next.id)
          }}
          onRemove={
            canEditDraft
              ? () => {
                  const updated = goals.filter((g) => g.id !== selectedGoal.id)
                  clearCreating()
                  setAndPersist(updated)
                  closeGoal()
                }
              : undefined
          }
        />
      </div>
    )
  }

  const showsGoals = !toolbarOnly

  return (
    <div
      className={
        toolbarOnly ? 'pd-goals-shell pd-goals-shell--toolbar-only' : 'pd-goals-shell'
      }
      aria-label={showsGoals ? 'My goals' : undefined}
    >
      {showsGoals ? (
        <>
          {row.status === 'sent_back' && row.sendBackReason ? (
            <Notice tone="warn">Sent back: {row.sendBackReason}</Notice>
          ) : null}
          {row.status === 'approved' && canEditDraft ? (
            <Notice tone="warn">
              Editing goal details will require approval again. Progress updates
              do not affect approval.
            </Notice>
          ) : null}

          {showOwnScore && row.rating ? (
            <Notice tone="ok">
              Your quarter score: {row.rating.tier}/5
              {row.rating.comment ? ` — ${row.rating.comment}` : ''}
            </Notice>
          ) : null}
        </>
      ) : null}

      {toolbarStart || (showsGoals && canEditDraft && goals.length > 0) ? (
        <div className="pd-goals-toolbar">
          {toolbarStart}
          {showsGoals && canEditDraft && goals.length > 0 ? (
            <div
              className="pd-people__toolbar"
              role="toolbar"
              aria-label="Goal actions"
            >
              <button
                type="button"
                className="pd-people__ghost-btn"
                disabled={busy}
                onClick={() => void onPersistGoals(goals)}
              >
                {row.status === 'draft' || row.status === 'sent_back'
                  ? 'Save Draft'
                  : 'Save Changes'}
              </button>
              {canSubmit &&
              (row.status === 'draft' || row.status === 'sent_back') ? (
                <button
                  type="button"
                  className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                  disabled={busy || !submitCheck.ok}
                  onClick={() => {
                    onSubmit(goals)
                  }}
                >
                  <Send size={16} strokeWidth={1.75} aria-hidden />
                  Submit All
                </button>
              ) : null}
              <button
                type="button"
                className="pd-people__create-btn"
                disabled={busy}
                onClick={addGoal}
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Goal
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!showsGoals ? null : goals.length === 0 ? (
        <EmptyState
          className="pd-goals__empty"
          icon={Target}
          title="No goals yet"
          description="Add a goal to get started. Each needs measurements, and weights must total 100%."
          action={
            canEditDraft ? (
              <button
                type="button"
                className="pd-people__create-btn"
                disabled={busy}
                onClick={addGoal}
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Goal
              </button>
            ) : undefined
          }
        />
      ) : (
        <GoalsTable
          goals={goals}
          status={row.status}
          onOpen={(id) => onOpenGoal(id)}
        />
      )}
    </div>
  )
}

function GoalsTable({
  goals,
  status,
  onOpen,
}: {
  goals: Goal[]
  status: PersonGoals['status']
  onOpen: (id: string) => void
}) {
  return (
    <div className="pd-goals-table" role="table" aria-label="All goals">
      <div className="pd-goals-table__head" role="row">
        <div role="columnheader">Goals</div>
        <div role="columnheader">Weight</div>
        <div role="columnheader">Progress</div>
        <div role="columnheader">Metric</div>
        <div role="columnheader">Status</div>
        <div role="columnheader">Approval</div>
      </div>
      {goals.map((goal, index) => {
        const completion = Math.round(goalCompletion(goal))
        const track = trackLabel(status, completion, goal.progressStatus)
        return (
          <button
            key={goal.id}
            type="button"
            className="pd-goals-table__row"
            role="row"
            onClick={() => onOpen(goal.id)}
          >
            <div className="pd-goals-table__goal" role="cell">
              <span className="pd-goals-table__title">
                {goalTitle(goal, index)}
              </span>
            </div>
            <div className="pd-goals-table__weight" role="cell">
              <span className="pd-goals-table__weight-pill">{goal.weight}%</span>
            </div>
            <div className="pd-goals-table__progress" role="cell">
              <span className="pd-goals-table__progress-label">{completion}%</span>
              <Progress value={completion} />
            </div>
            <div className="pd-goals-table__metric" role="cell">
              {metricSummary(goal)}
            </div>
            <div
              className={`pd-goals-table__track pd-goals-table__track--${track.tone}`}
              role="cell"
            >
              {track.label}
            </div>
            <div className="pd-goals-table__approval" role="cell">
              {status === 'approved' ? (
                <span className="pd-goals-table__check" aria-label="Approved">
                  ✓
                </span>
              ) : status === 'submitted' ? (
                <Badge variant="pending">Pending</Badge>
              ) : (
                <span className="pd-goals-table__dash">—</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

