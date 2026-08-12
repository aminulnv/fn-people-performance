import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  MetricTile,
  PageHeader,
  Progress,
  Select,
  Tabs,
  Textarea,
} from '@/components/ui'
import {
  approveGoals,
  canSubmitGoals,
  fetchGoalsSnapshot,
  goalCompletion,
  isEligibleForCycle,
  newId,
  overallCompletion,
  ratePerson,
  saveGoals,
  saveProgress,
  sendBackGoals,
  submitGoals,
  sumGoalWeights,
  sumMeasurementWeights,
  watchGoalsSnapshot,
  type DemoPhase,
  type Goal,
  type GoalsSnapshot,
  type Measurement,
  type PersonGoals,
} from '@/lib/goalsApi'
import { CURRENT_CYCLE_ID } from '@/lib/goals/demoData'
import { DEMO_PHASES } from '@/lib/goals/phases'
import { statusLabel, statusVariant } from './goals/statusLabels'
import '@/styles/layout-goals.css'

function blankGoal(): Goal {
  return {
    id: newId('goal'),
    description: '',
    goalType: 'Outcome',
    processType: 'OKR',
    priority: 'Medium',
    weight: 0,
    measurements: [],
  }
}

function blankMilestone(): Measurement {
  return {
    id: newId('ms'),
    kind: 'milestone',
    title: '',
    weight: 0,
    complete: false,
  }
}

function phaseLabel(phase: DemoPhase): string {
  return DEMO_PHASES.find((p) => p.id === phase)?.label ?? phase
}

function goalTitle(goal: Goal, index: number): string {
  const trimmed = goal.description.trim()
  return trimmed || `Untitled goal ${index + 1}`
}

function metricSummary(goal: Goal): string {
  const metrics = goal.measurements.filter((m) => m.kind === 'metric')
  if (metrics.length === 1) {
    const m = metrics[0]
    return `${m.currentValue} → ${m.targetValue}`
  }
  const done = goal.measurements.filter(
    (m) => m.kind === 'milestone' && m.complete,
  ).length
  const total = goal.measurements.length
  return `${done} → ${total}`
}

function trackLabel(
  status: PersonGoals['status'],
  completion: number,
): { label: string; tone: 'ok' | 'warn' | 'muted' | 'danger' } {
  if (status === 'incomplete') return { label: 'Off track', tone: 'danger' }
  if (completion >= 100) return { label: 'Completed', tone: 'ok' }
  if (status === 'approved' || status === 'submitted') {
    return { label: 'On track', tone: 'ok' }
  }
  if (status === 'sent_back') return { label: 'Needs work', tone: 'warn' }
  return { label: 'Not started', tone: 'muted' }
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

export default function GoalsPage() {
  const [snapshot, setSnapshot] = useState<GoalsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [sendBackReason, setSendBackReason] = useState('')
  const [ratingTier, setRatingTier] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [ratingComment, setRatingComment] = useState('')
  const [managerTab, setManagerTab] = useState('mine')
  const [detailOpen, setDetailOpen] = useState(false)

  const refresh = async () => {
    setSnapshot(await fetchGoalsSnapshot())
  }

  useEffect(() => {
    void refresh()
    return watchGoalsSnapshot(() => {
      void refresh()
      setReviewId(null)
      setDetailOpen(false)
    })
  }, [])

  const active = useMemo(() => {
    if (!snapshot) return null
    return snapshot.people.find((p) => p.id === snapshot.activePersonId) ?? null
  }, [snapshot])

  const activeGoals = active ? snapshot?.byPerson[active.id] : undefined

  const isManagerial =
    active?.role === 'manager' || active?.role === 'seniormanager'
  const isPeopleOps = active?.role === 'ptr' || active?.role === 'hrbp'

  const reports = useMemo(() => {
    if (!snapshot || !active || !isManagerial) return []
    return active.reportIds
      .map((id) => {
        const person = snapshot.people.find((p) => p.id === id)
        const row = snapshot.byPerson[id]
        if (!person || !row) return null
        return { person, row }
      })
      .filter(Boolean) as {
      person: NonNullable<typeof active>
      row: PersonGoals
    }[]
  }, [snapshot, active, isManagerial])

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

  if (!active || !activeGoals) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <PageHeader
          title="Goals"
          description={`${snapshot.cycle.label} · ${phaseLabel(snapshot.cycle.phase)}`}
        />
        <EmptyState
          title="No people yet"
          description="Create employees in People to start setting and reviewing goals."
          action={
            <Link to="/people/new" className="pd-btn pd-btn--primary pd-btn--md">
              <span className="pd-btn__label">Create employee</span>
            </Link>
          }
        />
      </div>
    )
  }

  const eligible = isEligibleForCycle(active, snapshot.cycle)
  const weightTotal = sumGoalWeights(activeGoals.goals)
  const completion = Math.round(overallCompletion(activeGoals.goals))
  const canEditDraft =
    eligible &&
    (activeGoals.status === 'draft' || activeGoals.status === 'sent_back') &&
    snapshot.cycle.phase === 'window_open'
  const showProgress =
    activeGoals.status === 'approved' &&
    (snapshot.cycle.phase === 'hard_lock' ||
      snapshot.cycle.phase === 'check_in')
  const pendingCount = reports.filter((r) => r.row.status === 'submitted').length

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const isCurrentCycle = snapshot.cycle.id === CURRENT_CYCLE_ID

  const myGoalsPanel = (
    <EmployeePanel
      personName={active.name}
      personId={active.id}
      cycleLabel={snapshot.cycle.label}
      isCurrentCycle={isCurrentCycle}
      row={activeGoals}
      eligible={eligible}
      canEditDraft={canEditDraft}
      showProgress={showProgress}
      showOwnScore={Boolean(activeGoals.rating)}
      phase={snapshot.cycle.phase}
      busy={busy}
      onDetailOpenChange={setDetailOpen}
      onPersistGoals={(goals) => {
        if (canEditDraft) void run(() => saveGoals(active.id, goals))
        else if (showProgress) void run(() => saveProgress(active.id, goals))
      }}
      onSubmit={() => void run(() => submitGoals(active.id))}
    />
  )

  return (
    <div className="pd-page pd-goals" aria-label="Goals">
      {!detailOpen ? (
        <>
          <PageHeader
            title="Goals"
            description={`${snapshot.cycle.label} · ${phaseLabel(snapshot.cycle.phase)} · ${active.name}`}
          />
          <div className="pd-goals__summary">
            <MetricTile
              label="Status"
              value={statusLabel(activeGoals.status)}
              hint={eligible ? active.title : 'Not eligible this quarter'}
            />
            <MetricTile
              label="Goal weight"
              value={`${weightTotal}%`}
              hint={weightTotal === 100 ? 'Ready' : 'Must total 100%'}
            />
            <MetricTile
              label="Completion"
              value={`${completion}%`}
              hint={`${activeGoals.goals.length} goals`}
            />
          </div>
        </>
      ) : null}

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {isPeopleOps ? <PtrOverview snapshot={snapshot} /> : null}

      {isManagerial ? (
        <Tabs
          value={managerTab}
          onValueChange={(tab) => {
            setManagerTab(tab)
            setDetailOpen(false)
          }}
          items={[
            { id: 'mine', label: 'My goals', content: myGoalsPanel },
            {
              id: 'team',
              label: pendingCount > 0 ? `Team (${pendingCount})` : 'Team',
              content: (
                <ManagerPanel
                  snapshot={snapshot}
                  reports={reports}
                  selected={selectedReview}
                  sendBackReason={sendBackReason}
                  onSendBackReason={setSendBackReason}
                  ratingTier={ratingTier}
                  ratingComment={ratingComment}
                  onRatingTier={setRatingTier}
                  onRatingComment={setRatingComment}
                  busy={busy}
                  onDetailOpenChange={setDetailOpen}
                  onSelect={setReviewId}
                  onApprove={(id, goals) => void run(() => approveGoals(id, goals))}
                  onSendBack={(id) =>
                    void run(async () => {
                      await sendBackGoals(id, sendBackReason)
                      setSendBackReason('')
                    })
                  }
                  onRate={(id) =>
                    void run(async () => {
                      await ratePerson(id, {
                        tier: ratingTier,
                        comment: ratingComment,
                      })
                      setRatingComment('')
                    })
                  }
                />
              ),
            },
          ]}
        />
      ) : null}

      {active.role === 'employee' ? myGoalsPanel : null}
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
  onDetailOpenChange,
}: {
  snapshot: GoalsSnapshot
  reports: { person: GoalsSnapshot['people'][number]; row: PersonGoals }[]
  selected: { person: GoalsSnapshot['people'][number]; row: PersonGoals } | null
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
  onDetailOpenChange?: (open: boolean) => void
}) {
  const pending = reports.filter((r) => r.row.status === 'submitted')
  const approved = reports.filter((r) => r.row.status === 'approved')
  const queue =
    snapshot.cycle.phase === 'check_in'
      ? [...pending, ...approved]
      : pending

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
        title={
          snapshot.cycle.phase === 'check_in'
            ? 'No team members ready'
            : 'No pending approvals'
        }
        description={
          snapshot.cycle.phase === 'check_in'
            ? 'Approved goals will appear here for check-in.'
            : 'Submitted goals from your team will show up here.'
        }
      />
    )
  }

  const goals = active?.row.goals ?? []
  const selectedIndex = openGoalId
    ? Math.max(
        0,
        goals.findIndex((g) => g.id === openGoalId),
      )
    : -1
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null

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
            <Avatar name={person.name} size="sm" />
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
          <div className="pd-goals-team__detail-head">
            <div>
              <h3>{active.person.name}</h3>
              <p className="pd-goals-team__title">{active.person.title}</p>
            </div>
            <Badge variant={statusVariant(active.row.status)}>
              {statusLabel(active.row.status)}
            </Badge>
          </div>

          {selectedGoal ? (
            <GoalDetail
              goal={selectedGoal}
              index={selectedIndex}
              total={goals.length}
              ownerName={active.person.name}
              cycleLabel={snapshot.cycle.label}
              isCurrentCycle={snapshot.cycle.id === CURRENT_CYCLE_ID}
              status={active.row.status}
              readOnly
              progressMode={false}
              onChange={() => undefined}
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

          {!selectedGoal && active.row.status === 'submitted' ? (
            <div className="pd-goals-rate">
              <Textarea
                label="Send back reason"
                value={sendBackReason}
                onChange={(e) => onSendBackReason(e.target.value)}
                placeholder="Required only if you send back"
                rows={2}
              />
              <div className="pd-goals__footer-actions">
                <Button
                  disabled={busy}
                  onClick={() => onApprove(active.person.id, active.row.goals)}
                >
                  Approve all
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || !sendBackReason.trim()}
                  onClick={() => onSendBack(active.person.id)}
                >
                  Send back
                </Button>
              </div>
            </div>
          ) : null}

          {!selectedGoal &&
          snapshot.cycle.phase === 'check_in' &&
          active.row.status === 'approved' &&
          !active.row.rating ? (
            <div className="pd-goals-rate">
              <div>
                <p className="pd-goal-aside-row__label">Quarter score</p>
                <p className="pd-goal-aside-row__value">
                  {Math.round(overallCompletion(active.row.goals))}% complete
                </p>
                <div className="pd-goals-rate__tiers">
                  {([1, 2, 3, 4, 5] as const).map((tier) => (
                    <Button
                      key={tier}
                      size="sm"
                      variant={ratingTier === tier ? 'primary' : 'secondary'}
                      onClick={() => onRatingTier(tier)}
                    >
                      {tier}
                    </Button>
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
                <Button disabled={busy} onClick={() => onRate(active.person.id)}>
                  Submit score
                </Button>
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
  showProgress,
  showOwnScore,
  phase,
  busy,
  onPersistGoals,
  onSubmit,
  onDetailOpenChange,
}: {
  personName: string
  personId: string
  cycleLabel: string
  isCurrentCycle: boolean
  row: PersonGoals
  eligible: boolean
  canEditDraft: boolean
  showProgress: boolean
  showOwnScore: boolean
  phase: DemoPhase
  busy: boolean
  onPersistGoals: (goals: Goal[]) => void
  onSubmit: () => void
  onDetailOpenChange?: (open: boolean) => void
}) {
  const [goals, setGoals] = useState(row.goals)
  /** null = list view; id = single-goal detail */
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    setGoals(row.goals)
    setOpenId((prev) =>
      prev && row.goals.some((g) => g.id === prev) ? prev : null,
    )
  }, [personId, row.status, row.goals])

  useEffect(() => {
    onDetailOpenChange?.(Boolean(openId))
  }, [openId, onDetailOpenChange])

  const submitCheck = canSubmitGoals(goals)
  const selectedIndex = openId
    ? Math.max(
        0,
        goals.findIndex((g) => g.id === openId),
      )
    : -1
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null

  const setLocal = (next: Goal[]) => setGoals(next)
  const setAndPersist = (next: Goal[]) => {
    setGoals(next)
    onPersistGoals(next)
  }

  const addGoal = () => {
    const next = blankGoal()
    setAndPersist([...goals, next])
    setOpenId(next.id)
  }

  if (!eligible || row.status === 'not_eligible') {
    return (
      <EmptyState
        title="Not eligible this quarter"
        description={`${personName} joined after Day 1, so goal setting starts next quarter.`}
      />
    )
  }

  if (row.status === 'incomplete') {
    return (
      <Notice tone="danger">
        No submission by Day 30 — flagged incomplete. Quarter score is 0.
      </Notice>
    )
  }

  if (selectedGoal) {
    return (
      <div className="pd-goals-shell" aria-label="Goal detail">
        <GoalDetail
          goal={selectedGoal}
          index={selectedIndex}
          total={goals.length}
          ownerName={personName}
          cycleLabel={cycleLabel}
          isCurrentCycle={isCurrentCycle}
          status={row.status}
          readOnly={!canEditDraft && !showProgress}
          progressMode={showProgress}
          onBack={() => {
            if (canEditDraft) onPersistGoals(goals)
            setOpenId(null)
          }}
          onSelectIndex={(nextIndex) => {
            const next = goals[nextIndex]
            if (next) setOpenId(next.id)
          }}
          onChange={(next) => {
            const updated = goals.map((g) =>
              g.id === selectedGoal.id ? next : g,
            )
            if (showProgress) setAndPersist(updated)
            else setLocal(updated)
          }}
          onRemove={
            canEditDraft
              ? () => {
                  const updated = goals.filter((g) => g.id !== selectedGoal.id)
                  setAndPersist(updated)
                  setOpenId(null)
                }
              : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className="pd-goals-shell" aria-label="My goals">
      {row.status === 'sent_back' && row.sendBackReason ? (
        <Notice tone="warn">Sent back: {row.sendBackReason}</Notice>
      ) : null}

      {row.status === 'submitted' ? (
        <Notice>
          Pending manager approval
          {phase !== 'window_open'
            ? '. Hard lock has passed — your manager can still approve.'
            : '.'}
        </Notice>
      ) : null}

      {showOwnScore && row.rating ? (
        <Notice tone="ok">
          Your quarter score: {row.rating.tier}/5
          {row.rating.comment ? ` — ${row.rating.comment}` : ''}
        </Notice>
      ) : null}

      <div className="pd-goals-toolbar">
        <div className="pd-goals-shell__actions">
          {canEditDraft ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void onPersistGoals(goals)}
              >
                Save draft
              </Button>
              <Button
                size="sm"
                disabled={busy || !submitCheck.ok}
                onClick={() => {
                  onPersistGoals(goals)
                  onSubmit()
                }}
              >
                Submit all
              </Button>
              <Button size="sm" disabled={busy} onClick={addGoal}>
                + Add new goal
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Add a goal to get started. Each needs measurements, and weights must total 100%."
          action={
            canEditDraft ? (
              <Button onClick={addGoal}>+ Add new goal</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <GoalsTable
            goals={goals}
            status={row.status}
            onOpen={(id) => setOpenId(id)}
          />
        </>
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
        const track = trackLabel(status, completion)
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

function GoalDetail({
  goal,
  index,
  total,
  ownerName,
  cycleLabel,
  isCurrentCycle = false,
  status,
  readOnly,
  progressMode,
  onChange,
  onRemove,
  onSelectIndex,
  onBack,
}: {
  goal: Goal
  index: number
  total: number
  ownerName: string
  cycleLabel: string
  isCurrentCycle?: boolean
  status: PersonGoals['status']
  readOnly: boolean
  progressMode: boolean
  onChange: (goal: Goal) => void
  onRemove?: () => void
  onSelectIndex: (index: number) => void
  onBack?: () => void
}) {
  const patch = (partial: Partial<Goal>) => onChange({ ...goal, ...partial })
  const patchMeasurement = (id: string, next: Measurement) => {
    onChange({
      ...goal,
      measurements: goal.measurements.map((m) => (m.id === id ? next : m)),
    })
  }
  const locked = readOnly || progressMode
  const completion = Math.round(goalCompletion(goal))
  const measureWeight = sumMeasurementWeights(goal.measurements)

  const statusTone =
    status === 'approved'
      ? ''
      : status === 'submitted'
        ? ' is-pending'
        : ' is-draft'

  return (
    <div className="pd-goal-detail-page">
      <header className="pd-goal-detail__header">
        {onBack ? (
          <button
            type="button"
            className="pd-goal-detail__back"
            onClick={onBack}
          >
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            All goals
          </button>
        ) : null}

        <div className="pd-goal-detail__heading-row">
          <div className="pd-goal-detail__heading">
            {locked ? (
              <h1 className="pd-goal-detail__title">{goalTitle(goal, index)}</h1>
            ) : (
              <textarea
                className="pd-goal-detail__title-input"
                value={goal.description}
                rows={2}
                placeholder="Goal title"
                aria-label="Goal title"
                onChange={(e) => patch({ description: e.target.value })}
              />
            )}
          </div>
          <div className="pd-goal-detail__actions">
            {onRemove ? (
              <Button size="sm" variant="ghost" onClick={onRemove}>
                Remove
              </Button>
            ) : null}
            <div className="pd-goal-detail__pager">
              <Button
                size="sm"
                variant="ghost"
                disabled={index <= 0}
                aria-label="Previous goal"
                onClick={() => onSelectIndex(index - 1)}
              >
                ‹
              </Button>
              <span>
                {index + 1}/{total}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={index >= total - 1}
                aria-label="Next goal"
                onClick={() => onSelectIndex(index + 1)}
              >
                ›
              </Button>
            </div>
          </div>
        </div>

        <dl className="pd-goal-detail__meta">
          <div className="pd-goal-detail__meta-item">
            <dt>Cycle</dt>
            <dd>
              <strong>{cycleLabel}</strong>
              {isCurrentCycle ? (
                <Badge variant="completed">Current</Badge>
              ) : null}
            </dd>
          </div>
          <div className="pd-goal-detail__meta-item">
            <dt>Status</dt>
            <dd>
              <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
            </dd>
          </div>
          <div className="pd-goal-detail__meta-item pd-goal-detail__progress">
            <dt>Progress</dt>
            <dd>
              <strong>{completion}%</strong>
              <Progress value={completion} />
            </dd>
          </div>
        </dl>
      </header>

      <div className="pd-goal-detail">
      <div className="pd-goal-detail__main">
        <section className="pd-goal-todos" aria-label="To dos">
          <div className="pd-goal-todos__head">
            <h3>To Do&apos;s</h3>
            <span className="pd-goal-todos__weight">
              {measureWeight}% / 100%
            </span>
          </div>

          {goal.measurements.length === 0 ? (
            <div className="pd-goal-todos__empty">
              {locked
                ? 'No measurements on this goal.'
                : 'Add milestones or metrics that prove this goal.'}
            </div>
          ) : (
            <div className="pd-goal-todos__list">
              {goal.measurements.map((m) => (
                <div key={m.id} className="pd-goal-todo">
                  {m.kind === 'milestone' ? (
                    <Checkbox
                      className="pd-goal-todo__check"
                      label={m.title || 'Mark done'}
                      checked={m.complete}
                      disabled={readOnly && !progressMode}
                      onChange={(e) =>
                        patchMeasurement(m.id, {
                          ...m,
                          complete: e.target.checked,
                        })
                      }
                    />
                  ) : (
                    <span aria-hidden="true" className="pd-goal-todo__check-spacer" />
                  )}
                  <div>
                    {locked || progressMode ? (
                      <p
                        className={`pd-goal-todo__title${
                          m.kind === 'milestone' && m.complete ? ' is-done' : ''
                        }`}
                      >
                        {m.title || 'Untitled measurement'}
                      </p>
                    ) : (
                      <Input
                        aria-label="Measurement title"
                        value={m.title}
                        placeholder="Measurement"
                        onChange={(e) =>
                          patchMeasurement(m.id, {
                            ...m,
                            title: e.target.value,
                          })
                        }
                      />
                    )}
                    <p className="pd-goal-todo__meta">
                      {m.kind === 'milestone'
                        ? `Milestone · ${m.weight}%`
                        : `Metric · ${m.weight}% · target ${m.targetValue}${m.unit}`}
                    </p>
                  </div>
                  <div className="pd-goal-todo__control">
                    {m.kind === 'metric' ? (
                      <Input
                        aria-label={`Current value for ${m.title || 'metric'}`}
                        type="number"
                        value={m.currentValue}
                        disabled={readOnly && !progressMode}
                        onChange={(e) =>
                          patchMeasurement(m.id, {
                            ...m,
                            currentValue: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : !locked && !progressMode ? (
                      <Input
                        aria-label="Measurement weight"
                        type="number"
                        min={0}
                        max={100}
                        value={m.weight}
                        onChange={(e) =>
                          patchMeasurement(m.id, {
                            ...m,
                            weight: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!locked ? (
            <div className="pd-goal-todos__add">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  onChange({
                    ...goal,
                    measurements: [...goal.measurements, blankMilestone()],
                  })
                }
              >
                Add to-do
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="pd-goal-detail__aside" aria-label="Goal details">
        <div className={`pd-goal-aside-card pd-goal-aside-card--status${statusTone}`}>
          <p className="pd-goal-aside-card__label">Approval</p>
          <p className="pd-goal-aside-card__value">{statusLabel(status)}</p>
          <p className="pd-goal-aside-card__sub">
            {status === 'approved'
              ? 'Approved for this cycle'
              : status === 'submitted'
                ? 'Waiting on manager'
                : 'Not submitted yet'}
          </p>
        </div>

        <div className="pd-goal-aside-card">
          <div className="pd-goal-aside-rows">
            <div>
              <p className="pd-goal-aside-row__label">Owner</p>
              <div className="pd-goal-aside-owner">
                <Avatar name={ownerName} size="sm" />
                <p className="pd-goal-aside-row__value">{ownerName}</p>
              </div>
            </div>

            {goal.linkedGoalLabel ? (
              <div>
                <p className="pd-goal-aside-row__label">Linked goal</p>
                <p className="pd-goal-aside-row__value">{goal.linkedGoalLabel}</p>
              </div>
            ) : null}

            {locked ? (
              <>
                <div>
                  <p className="pd-goal-aside-row__label">Type</p>
                  <p className="pd-goal-aside-row__value">
                    {goal.goalType} · {goal.processType}
                  </p>
                </div>
                <div>
                  <p className="pd-goal-aside-row__label">Priority</p>
                  <p className="pd-goal-aside-row__value">{goal.priority}</p>
                </div>
                <div>
                  <p className="pd-goal-aside-row__label">Weight</p>
                  <p className="pd-goal-aside-row__value">{goal.weight}%</p>
                </div>
              </>
            ) : (
              <div className="pd-goal-aside-fields">
                <Select
                  label="Type"
                  value={goal.goalType}
                  options={[
                    { value: 'Outcome', label: 'Outcome' },
                    { value: 'Output', label: 'Output' },
                  ]}
                  onChange={(e) =>
                    patch({ goalType: e.target.value as Goal['goalType'] })
                  }
                />
                <Select
                  label="Process"
                  value={goal.processType}
                  options={[
                    { value: 'OKR', label: 'OKR' },
                    { value: 'BAU', label: 'BAU' },
                    { value: 'PI', label: 'PI' },
                  ]}
                  onChange={(e) =>
                    patch({ processType: e.target.value as Goal['processType'] })
                  }
                />
                <Select
                  label="Priority"
                  value={goal.priority}
                  options={[
                    { value: 'High', label: 'High' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Low', label: 'Low' },
                  ]}
                  onChange={(e) =>
                    patch({ priority: e.target.value as Goal['priority'] })
                  }
                />
                <Input
                  label="Weight %"
                  type="number"
                  min={0}
                  max={100}
                  value={goal.weight}
                  onChange={(e) =>
                    patch({ weight: Number(e.target.value) || 0 })
                  }
                />
              </div>
            )}
          </div>
        </div>
      </aside>
      </div>
    </div>
  )
}
