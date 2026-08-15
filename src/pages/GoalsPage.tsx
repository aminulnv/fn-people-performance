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
  Tooltip,
  ListboxSelect,
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
import type { GoalProgressStatus } from '@/lib/goals/types'
import { blankGoal } from '@/lib/goals/measurements'
import type {
  CascadeRecipient,
  GoalOwnerOption,
  LineManagerCascade,
} from '@/lib/goals/operations'
import type { GoalCapabilities } from '@/lib/goals/permissions'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { getEmployee } from '@/lib/employees/store'
import {
  setActiveCycle,
} from '@/lib/goals/store'
import { DEMO_PHASES } from '@/lib/goals/phases'
import { GoalCreateDrawer } from './goals/GoalCreateDrawer'
import { GoalCreateForm } from './goals/GoalCreateForm'
import { GoalDetailView } from './goals/GoalDetailView'
import { ReportGoalsCard } from './goals/ReportGoalsCard'
import { GoalsCycleSelect } from './goals/GoalsCycleSelect'
import {
  useGoalsController,
  subjectIsEligible,
} from './goals/useGoalsController'
import {
  goalTitle,
  goalSectionLabels,
  goalsDetailPath,
  goalsGoalPath,
  GOAL_PROGRESS_STATUS_OPTIONS,
  metricCountLabel,
  metricSummary,
  metricTipDetails,
  personMatchesScope,
  progressStatusClass,
  trackLabel,
  trackToneClass,
  type GoalsDirectoryScope,
} from './goals/goalHelpers'
import { statusLabel, statusVariant } from './goals/statusLabels'
import { reviewsTabPath } from '@/lib/reviews/paths'
import '@/styles/layout-people.css'
import '@/styles/layout-goals.css'

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

const OVERVIEW_SCOPES: { id: GoalsDirectoryScope; label: string }[] = [
  { id: 'mine', label: 'My Goals' },
  { id: 'reports', label: 'My Reports' },
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

export default function GoalsPage() {
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
            <span className="pd-people__summary-label">{item.label}</span>
            <span className="pd-people__summary-value">{item.value}</span>
          </button>
        ))}
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <GoalsCycleSelect
            cycles={snapshot.availableCycles}
            activeCycleId={snapshot.cycle.id}
          />
          {me ? (
            <SegmentedControl
              className="pd-people__scope pd-goals-overview__scope"
              buttonClassName="pd-people__scope-btn"
              options={OVERVIEW_SCOPES}
              value={scope}
              onChange={setScope}
              aria-label="Goals scope"
            />
          ) : null}
          <label className="pd-people__search pd-goals-overview__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search goals</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search goals or people…"
              className="pd-people__search-input"
            />
          </label>
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
            : "My Reports' goals"}
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
                    ? scope === 'reports'
                      ? 'You have no direct reports with goals in this cycle.'
                      : 'No goals are available in this scope.'
                    : 'Try a different search or status filter.'
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
                  const personTo = goalsDetailPath(
                    snapshot.cycle.id,
                    row.person.id,
                  )
                  const to = row.goalId
                    ? goalsGoalPath(
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
                          className={`pd-goals-overview__track ${trackToneClass(track.tone)}`}
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

export function GoalsPersonDetail({
  cycleId,
  personId,
  goalId,
  embedded = false,
}: {
  cycleId?: string
  personId: string
  goalId?: string
  embedded?: boolean
}) {
  const navigate = useNavigate()
  const {
    snapshot,
    actor,
    subject: active,
    subjectGoals: activeGoals,
    reports,
    ownerOptions,
    cascadeFrom,
    cascadeFromFor,
    cascadeRecipientsFor,
    capabilities,
    capabilitiesFor,
    resolveOwner,
    busy,
    error,
    actions,
  } = useGoalsController({ cycleId, subjectId: personId })
  const [sendBackReason, setSendBackReason] = useState('')
  const [ratingTier, setRatingTier] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [ratingComment, setRatingComment] = useState('')
  const [managerTab, setManagerTab] = useState<ManagerTab>('mine')
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [embeddedGoalId, setEmbeddedGoalId] = useState<string | null>(null)

  useEffect(() => {
    if (!goalId || !activeGoals?.goals.some((goal) => goal.id === goalId)) return
    setManagerTab('mine')
  }, [goalId, activeGoals])

  /** The Reports section belongs to the profile owner, so it follows them. */
  const hasReports = Boolean(active && active.reportIds.length > 0)
  const isPeopleOps = actor?.role === 'ptr' || actor?.role === 'hrbp'

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
          navigate(goalsDetailPath(nextCycleId, personId))
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
  const pendingCount = reports.filter((r) => r.row.status === 'submitted').length

  const isCurrentCycle = snapshot.cycleStatus === 'current'
  const activeGoalId = embedded ? embeddedGoalId ?? undefined : goalId
  const sectionLabels = goalSectionLabels(active.name, actor?.id === active.id)
  const showsReports = hasReports && managerTab === 'team'
  const viewingAsManager = Boolean(
    actor &&
      active &&
      actor.id !== active.id &&
      capabilities?.canViewAsManager,
  )
  const showsSubjectReview = viewingAsManager && !showsReports
  const managerPanelReports = showsSubjectReview
    ? [{ person: active, row: activeGoals }]
    : reports

  const selectCycle = (nextCycleId: string) => {
    setActiveCycle(nextCycleId)
    if (embedded) {
      setEmbeddedGoalId(null)
      return
    }
    navigate(goalsDetailPath(nextCycleId, personId))
  }

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
        setEditingGoalId(null)
        if (embedded) {
          setEmbeddedGoalId(null)
        } else if (goalId) {
          navigate(goalsDetailPath(snapshot.cycle.id, personId))
        }
      }}
      aria-label="Goal sections"
    />
  )

  const openGoal = (nextGoalId: string | null) => {
    setEditingGoalId(null)
    if (embedded) {
      setEmbeddedGoalId(nextGoalId)
      return
    }
    if (nextGoalId) {
      navigate(goalsGoalPath(snapshot.cycle.id, personId, nextGoalId))
      return
    }
    navigate(goalsDetailPath(snapshot.cycle.id, personId))
  }

  const cycleSelect = (
    <GoalsCycleSelect
      cycles={snapshot.availableCycles}
      activeCycleId={snapshot.cycle.id}
      onSelect={selectCycle}
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
      canUpdateProgress={Boolean(capabilities?.canUpdateProgress)}
      canDuplicate={Boolean(capabilities?.canDuplicate)}
      canCascade={Boolean(capabilities?.canCascade)}
      canSubmit={Boolean(capabilities?.canSubmit)}
      showOwnScore={Boolean(activeGoals.rating)}
      busy={busy}
      openGoalId={activeGoalId}
      editingGoalId={editingGoalId}
      commentAuthorName={actor?.name ?? active.name}
      toolbarStart={
        <div className="pd-goals-toolbar__start">
          {cycleSelect}
          {hasReports ? managerTabs : null}
        </div>
      }
      toolbarOnly={showsReports || showsSubjectReview}
      ownerOptions={ownerOptions}
      cascadeFrom={cascadeFrom}
      cascadeRecipientsFor={cascadeRecipientsFor}
      cascadeHref={(pid, gid) => goalsGoalPath(snapshot.cycle.id, pid, gid)}
      resolveOwner={(goal) =>
        resolveOwner(goal, active.id) ?? {
          id: active.id,
          name: active.name,
          avatarUrl: active.avatarUrl,
        }
      }
      onOpenGoal={openGoal}
      onEditGoal={setEditingGoalId}
      onPersistGoals={(goals) => {
        void actions.saveGoals(active.id, goals)
      }}
      onPersistProgress={(goals) => {
        void actions.saveProgress(active.id, goals)
      }}
      onDuplicateGoal={(goalId) => actions.duplicateGoal(active.id, goalId)}
      cascadeTargets={reports.map(({ person }) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        avatarUrl: person.avatarUrl,
      }))}
      onCascadeGoal={(goalId, reportIds) =>
        actions.cascadeGoal(active.id, goalId, reportIds)
      }
      onSubmit={(goals) => void actions.saveAndSubmit(active.id, goals)}
    />
  )

  return (
    <div
      className={embedded ? 'pd-goals pd-goals--embedded' : 'pd-page pd-goals'}
      aria-label={`${active.name} goals`}
    >
      <header className="pd-goals-detail-header">
        {!embedded ? (
          <>
            <Link
              to="/goals"
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
          </>
        ) : null}
        <div
          className="pd-people__summary pd-goals-detail-header__summary"
          role="group"
          aria-label={`${active.name} goal totals`}
        >
          <div className="pd-people__summary-card">
            <span className="pd-people__summary-label">Status</span>
            <span className="pd-people__summary-value">
              {statusLabel(activeGoals.status)}
            </span>
          </div>
          <div className="pd-people__summary-card">
            <span className="pd-people__summary-label">Goals</span>
            <span className="pd-people__summary-value">
              {activeGoals.goals.length}
            </span>
          </div>
          <div className="pd-people__summary-card">
            <span className="pd-people__summary-label">Total weight</span>
            <span className="pd-people__summary-value">{weightTotal}%</span>
          </div>
          <div className="pd-people__summary-card">
            <span className="pd-people__summary-label">Completion</span>
            <span className="pd-people__summary-value">{completion}%</span>
          </div>
        </div>
      </header>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {isPeopleOps ? <PtrOverview snapshot={snapshot} /> : null}

      {myGoalsPanel}

      {showsReports || showsSubjectReview ? (
        <ManagerPanel
          snapshot={snapshot}
          reports={managerPanelReports}
          ownerOptions={ownerOptions}
          cascadeFromFor={cascadeFromFor}
          cascadeRecipientsFor={cascadeRecipientsFor}
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
          onSaveGoals={(id, goals) => void actions.saveGoals(id, goals)}
          onSaveProgress={(id, goals) => void actions.saveProgress(id, goals)}
          onApprove={(id, goals) => void actions.approve(id, goals)}
          onSendBack={(id) =>
            void actions.sendBack(id, sendBackReason).then(() => {
              setSendBackReason('')
            })
          }
          openedGoalId={showsSubjectReview ? activeGoalId ?? null : undefined}
          onOpenedGoalChange={showsSubjectReview ? openGoal : undefined}
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
  ownerOptions,
  cascadeFromFor,
  cascadeRecipientsFor,
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
  onApprove,
  onSendBack,
  onRate,
  onSaveGoals,
  onSaveProgress,
  openedGoalId,
  onOpenedGoalChange,
}: {
  snapshot: GoalsSnapshot
  reports: { person: GoalsSnapshot['people'][number]; row: PersonGoals }[]
  ownerOptions: GoalOwnerOption[]
  cascadeFromFor: (subjectId: string) => LineManagerCascade
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[]
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
  onApprove: (id: string, goals: Goal[]) => void
  onSendBack: (id: string) => void
  onRate: (id: string) => void
  onSaveGoals: (id: string, goals: Goal[]) => void
  onSaveProgress: (id: string, goals: Goal[]) => void
  openedGoalId?: string | null
  onOpenedGoalChange?: (goalId: string | null) => void
}) {
  const orderedReports = reports

  const [localOpenGoalId, setLocalOpenGoalId] = useState<string | null>(null)
  const openGoalId =
    openedGoalId !== undefined ? openedGoalId : localOpenGoalId
  const setOpenGoalId = (next: string | null) => {
    if (onOpenedGoalChange) onOpenedGoalChange(next)
    else setLocalOpenGoalId(next)
  }
  const [sendBackFor, setSendBackFor] = useState<string | null>(null)
  /** Manager's in-progress edit of a report's goal, before it is saved. */
  const [editDraft, setEditDraft] = useState<Goal | null>(null)

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No direct reports"
        description="People who report to you will show up here with their goals."
      />
    )
  }

  const active =
    reports.find((r) =>
      r.row.goals.some((goal) => goal.id === openGoalId),
    ) ?? null
  const goals = active?.row.goals ?? []
  const selectedIndex = goals.findIndex((goal) => goal.id === openGoalId)
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null

  const table = (
    <>
      {orderedReports.map(({ person, row }) => {
        const reportCaps = capabilitiesFor(person.id)
        return (
          <ReportGoalsCard
            key={person.id}
            person={person}
            status={row.status}
            goalCount={row.goals.length}
            canApprove={Boolean(reportCaps?.canApprove)}
            canSendBack={Boolean(reportCaps?.canSendBack)}
            busy={busy}
            sendBackOpen={sendBackFor === person.id}
            sendBackReason={sendBackReason}
            onToggleSendBack={() =>
              setSendBackFor(sendBackFor === person.id ? null : person.id)
            }
            onSendBackReason={onSendBackReason}
            onApprove={() => onApprove(person.id, row.goals)}
            onSendBack={() => {
              onSendBack(person.id)
              setSendBackFor(null)
            }}
          >
            {row.goals.length > 0 ? (
              <GoalsTable
                label={`${person.name} goals`}
                rows={row.goals.map((goal, index) => ({
                  goal,
                  status: row.status,
                  title: goalTitle(goal, index),
                }))}
                onOpen={setOpenGoalId}
                canEditStatus
                showApproval={false}
                onStatusChange={(goalId, progressStatus) => {
                  onSaveGoals(
                    person.id,
                    row.goals.map((goal) =>
                      goal.id === goalId ? { ...goal, progressStatus } : goal,
                    ),
                  )
                }}
              />
            ) : (
              <p className="pd-goals-approval__empty">
                No goals added for this cycle yet.
              </p>
            )}
          </ReportGoalsCard>
        )
      })}
    </>
  )

  if (!active || !selectedGoal) return table

  const caps = capabilitiesFor(active.person.id)
  const canEditReport = Boolean(caps?.canEditStructure)
  const canUpdateProgress = Boolean(caps?.canUpdateProgress)
  const owner =
    resolveOwner(selectedGoal, active.person.id) ?? {
      id: active.person.id,
      name: active.person.name,
      title: active.person.title,
      avatarUrl: active.person.avatarUrl,
    }

  const saveGoal = (next: Goal) => {
    onSaveGoals(
      active.person.id,
      goals.map((goal) => (goal.id === next.id ? next : goal)),
    )
  }

  const saveProgressGoal = (next: Goal) => {
    onSaveProgress(
      active.person.id,
      goals.map((goal) => (goal.id === next.id ? next : goal)),
    )
  }

  const closeDrawer = () => {
    setOpenGoalId(null)
    setEditDraft(null)
  }

  return (
    <>
      {table}
      <GoalCreateDrawer
        label={
          editDraft
            ? 'Edit goal'
            : `View ${goalTitle(selectedGoal, selectedIndex)}`
        }
        closeLabel="Close goal"
        onClose={closeDrawer}
      >
        <div className="pd-goals-review">
          {editDraft ? (
            <GoalCreateForm
              goal={editDraft}
              index={selectedIndex}
              total={goals.length}
              defaultOwnerId={active.person.id}
              ownerOptions={ownerOptions}
              cascadeFrom={cascadeFromFor(active.person.id)}
              cascadedTo={cascadeRecipientsFor(editDraft.id)}
              cascadeHref={(pid, gid) =>
                goalsGoalPath(snapshot.cycle.id, pid, gid)
              }
              onChange={setEditDraft}
              onBack={() => setEditDraft(null)}
              onSave={() => {
                saveGoal(editDraft)
                setEditDraft(null)
              }}
              onSelectIndex={(nextIndex) => {
                const next = goals[nextIndex]
                if (next) {
                  setOpenGoalId(next.id)
                  setEditDraft(next)
                }
              }}
            />
          ) : (
            <GoalDetailView
              goal={selectedGoal}
              index={selectedIndex}
              total={goals.length}
              owner={owner}
              cascadeFrom={cascadeFromFor(active.person.id)}
              cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
              cascadeHref={(pid, gid) =>
                goalsGoalPath(snapshot.cycle.id, pid, gid)
              }
              cycleLabel={snapshot.cycle.label}
              isCurrentCycle={snapshot.cycleStatus === 'current'}
              status={active.row.status}
              commentAuthorName={commentAuthorName}
              canEdit={canEditReport}
              canUpdateProgress={canUpdateProgress}
              canRemove={canEditReport}
              onEdit={
                canEditReport ? () => setEditDraft(selectedGoal) : undefined
              }
              onChange={saveProgressGoal}
              onRemove={
                canEditReport
                  ? () => {
                    onSaveGoals(
                      active.person.id,
                      goals.filter((goal) => goal.id !== selectedGoal.id),
                    )
                    closeDrawer()
                  }
                  : undefined
              }
              onSelectIndex={(nextIndex) => {
                const next = goals[nextIndex]
                if (next) setOpenGoalId(next.id)
              }}
            />
          )}

          {caps?.canRate ? (
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
      </GoalCreateDrawer>
    </>
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
  cascadeTargets,
  canSubmit,
  showOwnScore,
  busy,
  openGoalId,
  editingGoalId,
  commentAuthorName,
  toolbarStart,
  toolbarOnly = false,
  ownerOptions,
  cascadeFrom,
  cascadeRecipientsFor,
  cascadeHref,
  resolveOwner,
  onOpenGoal,
  onEditGoal,
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
  editingGoalId: string | null
  commentAuthorName: string
  toolbarStart?: ReactNode
  /**
   * Renders the toolbar row without the goals below it. The panel stays mounted
   * while another section is on screen, so the section tabs inside `toolbarStart`
   * keep their sliding indicator instead of remounting on every switch.
   */
  toolbarOnly?: boolean
  ownerOptions: GoalOwnerOption[]
  cascadeFrom: LineManagerCascade
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[]
  cascadeHref: (personId: string, goalId: string) => string
  resolveOwner: (goal: Goal) => {
    id: string
    name: string
    title?: string
    avatarUrl?: string
  }
  onOpenGoal: (goalId: string | null) => void
  onEditGoal: (goalId: string | null) => void
  onPersistGoals: (goals: Goal[]) => void
  /** Progress-only updates never send goals back for approval. */
  onPersistProgress: (goals: Goal[]) => void
  onDuplicateGoal: (goalId: string) => Promise<Goal | null>
  cascadeTargets: { id: string; name: string; title?: string; avatarUrl?: string }[]
  onCascadeGoal: (goalId: string, reportIds: string[]) => Promise<void>
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
  const creatingGoalId = [...creatingIds][0] ?? null
  const selectedGoalId = openGoalId ?? creatingGoalId
  const selectedIndex = selectedGoalId
    ? goals.findIndex((goal) => goal.id === selectedGoalId)
    : -1
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null

  const setLocal = (next: Goal[]) => setGoals(next)
  const setAndPersist = (next: Goal[]) => {
    setGoals(next)
    onPersistGoals(next)
  }

  const addGoal = () => {
    const next = blankGoal({ ownerId: personId })
    setCreatingIds((prev) => new Set(prev).add(next.id))
    setLocal([...goals, next])
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

  let goalDrawer: ReactNode = null

  if (!toolbarOnly && selectedGoal) {
    const isNew = creatingIds.has(selectedGoal.id)
    const useCreateForm = isNew || editingGoalId === selectedGoal.id

    const closeGoal = () => {
      setCreatingIds((prev) => {
        if (!prev.has(selectedGoal.id)) return prev
        const next = new Set(prev)
        next.delete(selectedGoal.id)
        return next
      })
      onEditGoal(null)
      onOpenGoal(null)
    }

    const replaceGoal = (next: Goal, persist: boolean) => {
      const updated = goals.map((g) => (g.id === selectedGoal.id ? next : g))
      if (persist) setAndPersist(updated)
      else setLocal(updated)
    }

    const discardNewGoal = () => {
      setGoals(row.goals)
      setCreatingIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedGoal.id)
        return next
      })
      onEditGoal(null)
    }

    const createForm = (
      <GoalCreateForm
        goal={selectedGoal}
        index={isNew ? 0 : selectedIndex}
        total={isNew ? 1 : goals.length}
        isNew={isNew}
        defaultOwnerId={personId}
        ownerOptions={ownerOptions}
        cascadeFrom={cascadeFrom}
        cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
        cascadeHref={cascadeHref}
        onBack={isNew ? discardNewGoal : closeGoal}
        onSave={() => {
          onPersistGoals(goals)
          setCreatingIds((prev) => {
            if (!prev.has(selectedGoal.id)) return prev
            const next = new Set(prev)
            next.delete(selectedGoal.id)
            return next
          })
          onEditGoal(null)
        }}
        onSelectIndex={(nextIndex) => {
          const next = goals[nextIndex]
          if (next) onOpenGoal(next.id)
        }}
        onChange={(next) => replaceGoal(next, false)}
        onRemove={
          canEditDraft
            ? isNew
              ? discardNewGoal
              : () => {
                const updated = goals.filter((g) => g.id !== selectedGoal.id)
                setAndPersist(updated)
                closeGoal()
              }
            : undefined
        }
      />
    )

    if (isNew) {
      goalDrawer = (
        <GoalCreateDrawer onClose={discardNewGoal}>{createForm}</GoalCreateDrawer>
      )
    } else {
      goalDrawer = (
        <GoalCreateDrawer
          label={useCreateForm ? 'Edit goal' : `View ${goalTitle(selectedGoal, selectedIndex)}`}
          closeLabel="Close goal"
          onClose={closeGoal}
        >
          {useCreateForm ? (
            createForm
          ) : (
            <GoalDetailView
              goal={selectedGoal}
              index={selectedIndex}
              total={goals.length}
              owner={ownerFor(selectedGoal)}
              cascadeFrom={cascadeFrom}
              cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
              cascadeHref={cascadeHref}
              cycleLabel={cycleLabel}
              isCurrentCycle={isCurrentCycle}
              status={row.status}
              commentAuthorName={commentAuthorName}
              canEdit={canEditDraft}
              canUpdateProgress={canUpdateProgress}
              canRemove={canEditDraft}
              canCascade={canCascade}
              cascadeTargets={cascadeTargets}
              onEdit={
                canEditDraft ? () => onEditGoal(selectedGoal.id) : undefined
              }
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
                  ? (reportIds) => {
                      void onCascadeGoal(selectedGoal.id, reportIds)
                    }
                  : undefined
              }
              onSelectIndex={(nextIndex) => {
                const next = goals[nextIndex]
                if (next) onOpenGoal(next.id)
              }}
              onChange={(next) => {
                const updated = goals.map((goal) =>
                  goal.id === selectedGoal.id ? next : goal,
                )
                setGoals(updated)
                onPersistProgress(updated)
              }}
              onRemove={
                canEditDraft
                  ? () => {
                    const updated = goals.filter(
                      (goal) => goal.id !== selectedGoal.id,
                    )
                    setAndPersist(updated)
                    closeGoal()
                  }
                  : undefined
              }
            />
          )}
        </GoalCreateDrawer>
      )
    }
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
          rows={goals.map((goal, index) => ({
            goal,
            status: row.status,
            title: goalTitle(goal, index),
          }))}
          onOpen={(id) => onOpenGoal(id)}
          canEditWeight={canEditDraft}
          canEditStatus={canUpdateProgress}
          onWeightChange={(goalId, weight) => {
            setLocal(
              goals.map((goal) =>
                goal.id === goalId ? { ...goal, weight } : goal,
              ),
            )
          }}
          onStatusChange={(goalId, progressStatus) => {
            const updated = goals.map((goal) =>
              goal.id === goalId ? { ...goal, progressStatus } : goal,
            )
            setGoals(updated)
            onPersistProgress(updated)
          }}
        />
      )}
      {goalDrawer}
    </div>
  )
}

const PROGRESS_STATUS_OPTIONS = GOAL_PROGRESS_STATUS_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
  className: progressStatusClass(option.id),
}))

type GoalsTableRow = {
  goal: Goal
  status: PersonGoals['status']
  title: string
  /** Set only when the table spans several people, e.g. a manager's reports. */
  owner?: { id: string; name: string; avatarUrl?: string }
}

function GoalsTable({
  rows,
  onOpen,
  label = 'All goals',
  canEditWeight = false,
  canEditStatus = false,
  showApproval = true,
  onWeightChange,
  onStatusChange,
}: {
  rows: GoalsTableRow[]
  onOpen: (id: string) => void
  label?: string
  canEditWeight?: boolean
  canEditStatus?: boolean
  /** Off when the surrounding card already states the submission status. */
  showApproval?: boolean
  onWeightChange?: (goalId: string, weight: number) => void
  onStatusChange?: (
    goalId: string,
    progressStatus: GoalProgressStatus | undefined,
  ) => void
}) {
  const showOwner = rows.some((row) => row.owner)
  return (
    <div
      className={`pd-goals-table${showOwner ? ' pd-goals-table--with-owner' : ''}${showApproval ? '' : ' pd-goals-table--no-approval'
        }`}
      role="table"
      aria-label={label}
    >
      <div className="pd-goals-table__head" role="row">
        {showOwner ? <div role="columnheader">Owner</div> : null}
        <div role="columnheader">Goals</div>
        <div role="columnheader">Weight</div>
        <div role="columnheader">Progress</div>
        <div role="columnheader">Metric</div>
        <div role="columnheader">Progress Status</div>
        {showApproval ? <div role="columnheader">Approval</div> : null}
      </div>
      {rows.map(({ goal, status, title, owner }) => {
        const completion = Math.round(goalCompletion(goal))
        const track = trackLabel(status, completion, goal.progressStatus)
        const metricTip = metricTipDetails(goal)
        const metricLabel = metricSummary(goal)
        const openGoal = () => onOpen(goal.id)
        return (
          <div
            key={goal.id}
            className="pd-goals-table__row"
            role="row"
            tabIndex={0}
            onClick={openGoal}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openGoal()
              }
            }}
          >
            {owner ? (
              <div className="pd-goals-table__owner" role="cell">
                <Avatar
                  name={owner.name}
                  src={owner.avatarUrl || undefined}
                  size="sm"
                />
                <span className="pd-goals-table__owner-name">{owner.name}</span>
              </div>
            ) : null}
            <div className="pd-goals-table__goal" role="cell">
              <span className="pd-goals-table__title">{title}</span>
            </div>
            <div className="pd-goals-table__weight" role="cell">
              {canEditWeight && onWeightChange ? (
                <div
                  className="pd-goals-table__weight-edit"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    className="pd-goals-table__weight-input"
                    value={goal.weight}
                    aria-label={`Weight for ${title}`}
                    onChange={(event) => {
                      const next = Math.min(
                        100,
                        Math.max(0, Number(event.target.value) || 0),
                      )
                      onWeightChange(goal.id, next)
                    }}
                  />
                  <span className="pd-goals-table__weight-suffix" aria-hidden>
                    %
                  </span>
                </div>
              ) : (
                <span className="pd-goals-table__weight-pill">{goal.weight}%</span>
              )}
            </div>
            <div className="pd-goals-table__progress" role="cell">
              <span className="pd-goals-table__progress-label">{completion}%</span>
              <Progress value={completion} />
            </div>
            <div className="pd-goals-table__metric" role="cell">
              {metricTip ? (
                <Tooltip
                  side="left"
                  delayMs={80}
                  content={
                    <div className="pd-goals-table__metric-tip">
                      <div className="pd-goals-table__metric-tip-title">
                        {metricTip.title}
                      </div>
                      <div className="pd-goals-table__metric-tip-rows">
                        <div className="pd-goals-table__metric-tip-row">
                          <span>Initial value</span>
                          <span>{metricTip.initial}</span>
                        </div>
                        <div className="pd-goals-table__metric-tip-row">
                          <span>
                            Current value (
                            <span
                              className={`pd-goals-table__metric-tip-status pd-goals-table__metric-tip-status--${track.tone}`}
                            >
                              {track.label}
                            </span>
                            )
                          </span>
                          <span>{metricTip.current}</span>
                        </div>
                        <div className="pd-goals-table__metric-tip-row">
                          <span>Target value</span>
                          <span>{metricTip.target}</span>
                        </div>
                        <div className="pd-goals-table__metric-tip-row">
                          <span>Unit</span>
                          <span>{metricTip.unit}</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <span className="pd-goals-table__metric-value">{metricLabel}</span>
                </Tooltip>
              ) : (
                metricLabel
              )}
            </div>
            <div className="pd-goals-table__status" role="cell">
              {canEditStatus && onStatusChange ? (
                <div
                  className={`pd-goals-table__status-edit ${progressStatusClass(
                    goal.progressStatus ?? 'on_track',
                  )}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <ListboxSelect
                    className="pd-goals-table__status-listbox"
                    value={goal.progressStatus ?? 'on_track'}
                    aria-label={`Progress status for ${title}`}
                    allowEmpty={false}
                    options={PROGRESS_STATUS_OPTIONS}
                    onValueChange={(next) => {
                      onStatusChange(goal.id, next as GoalProgressStatus)
                    }}
                  />
                </div>
              ) : (
                <span
                  className={`pd-goals-table__track ${trackToneClass(track.tone)}`}
                >
                  <span className="pd-goals-table__track-label">{track.label}</span>
                </span>
              )}
            </div>
            {showApproval ? (
              <div className="pd-goals-table__approval" role="cell">
                {status === 'approved' ? (
                  <span className="pd-goals-table__check" aria-label="Approved">
                    ✓
                  </span>
                ) : status === 'submitted' ? (
                  <Badge variant="pending">Pending</Badge>
                ) : (
                  <Badge variant={statusVariant(status)}>
                    {statusLabel(status)}
                  </Badge>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
