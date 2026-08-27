import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, CircleAlert, CornerDownRight, CornerRightDown, History, Scale } from 'lucide-react'
import { Avatar, CountBadge, Progress, Tooltip } from '@/components/ui'
import {
  distributeGoalWeights,
  goalCompletion,
  goalWeightIssue,
  hasUnassignedGoalWeight,
  sumGoalWeights,
  isMeasureGoalIssue,
  measureIssueLabel,
  type Goal,
  type PersonGoals,
  type SubmissionStatus,
} from '@/lib/goalsApi'
import {
  canEditMeasurementWeights,
  lockSoloMeasurementWeights,
  measurementPanels,
  setMeasurementPanelWeight,
  sumPanelWeights,
  todoMeasureItems,
  type MeasurementPanel,
} from '@/lib/goals/measurements'
import { proofParts } from '@/lib/goals/proof'
import type { Measurement } from '@/lib/goals/types'
import { formatProgressTimestamp, goalLastUpdatedAt } from '@/lib/goals/progressLog'
import { GoalActionsMenu, hasGoalActions } from '@/pages/goals/GoalActionsMenu'
import { GoalMeasureLogHover } from '@/pages/goals/GoalMeasureLogHover'
import { MeasureProofReadout } from '@/pages/goals/MeasureProofFields'
import { MeasureKindIcon } from '@/pages/goals/MeasureKindIcon'
import {
  GoalMeasureReadout,
  WeightHoverField,
  formatWeightReadout,
} from '@/pages/goals/GoalMeasurementReadout'
import {
  CascadeGoalTip,
  selectedCascadePerson,
} from '@/pages/goals/GoalCascadeField'
import type { CascadeTarget } from '@/pages/goals/GoalCascadeTargetDialog'
import { batchStatusLabel } from '@/pages/goals/approvalDisplay'
import type {
  CascadeRecipient,
  LineManagerCascade,
} from '@/lib/goals/operations'
import {
  cascadeTableLabel,
  cascadeToTableLabel,
  formatRefreshAge,
  isCascadedGoal,
  metricCountLabel,
} from '@/pages/goals/goalHelpers'
import { GoalStatusBadge } from '@/pages/goals/GoalStatusBadge'
import {
  measurePanelLatestProgressAt,
  measurePanelName,
  measurePanelProgress,
  measurePanelProgressLog,
  measurePanelTableWeight,
} from '@/pages/goals/measurePanelDisplay'
import '@/styles/layout-goals.css'

export function MetricsCountBadge({ count }: { count: number }) {
  return (
    <CountBadge
      count={count}
      tone="theme"
      aria-label={metricCountLabel(count)}
    />
  )
}

function CascadeIconTip({
  label,
  content,
  className,
  children,
}: {
  label: string
  content: ReactNode
  className: string
  children: ReactNode
}) {
  return (
    <Tooltip content={content} side="top" portal delayMs={80}>
      <span
        className={className}
        role="img"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </span>
    </Tooltip>
  )
}

function cascadedToTip(recipients: CascadeRecipient[]) {
  const tips = recipients.map((recipient) => (
    <CascadeGoalTip
      key={recipient.goalId}
      title={recipient.goalTitle || recipient.personName}
      ownerName={recipient.personName}
      ownerAvatarUrl={recipient.avatarUrl}
    />
  ))
  if (tips.length <= 1) return tips[0] ?? null
  return <section className="pd-goal-cascade-tip-stack">{tips}</section>
}

export function GoalCascadeIndicator({
  goal,
  cascadeFrom,
  cascadedTo = [],
  place = 'before',
}: {
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>
  cascadeFrom?: LineManagerCascade
  cascadedTo?: CascadeRecipient[]
  /** From stays before the name; to sits after it. */
  place?: 'before' | 'after'
}) {
  const fromLabel = isCascadedGoal(goal) ? cascadeTableLabel(goal) : null
  const toLabel = cascadedTo.length > 0 ? cascadeToTableLabel(cascadedTo) : null
  if (place === 'before' && fromLabel) {
    const selected = cascadeFrom
      ? selectedCascadePerson(goal, cascadeFrom)
      : null
    return (
      <CascadeIconTip
        label={fromLabel}
        className="pd-goals-table__cascade"
        content={
          <CascadeGoalTip
            title={
              selected?.title ||
              goal.linkedGoalLabel?.trim() ||
              'Manager goal'
            }
            ownerName={
              selected?.managerName || cascadeFrom?.managerName || undefined
            }
            ownerAvatarUrl={
              selected?.managerAvatarUrl || cascadeFrom?.managerAvatarUrl
            }
          />
        }
      >
        <CornerDownRight size={13} strokeWidth={2.25} aria-hidden />
      </CascadeIconTip>
    )
  }
  if (place === 'after' && toLabel) {
    return (
      <CascadeIconTip
        label={toLabel}
        className="pd-goals-table__cascade pd-goals-table__cascade--to"
        content={cascadedToTip(cascadedTo)}
      >
        <CornerRightDown size={13} strokeWidth={2.25} aria-hidden />
      </CascadeIconTip>
    )
  }
  return null
}

function compactUpdateAge(iso?: string): string | null {
  if (!iso) return null
  const age = formatRefreshAge(iso)
  return age === '—' ? null : age
}

export function GoalProgressAge({ at }: { at?: string }) {
  const age = compactUpdateAge(at)
  if (!age || !at) return null
  return (
    <span
      className="pd-goals-progress-age"
      title={formatProgressTimestamp(at)}
      aria-label={`Updated ${age}`}
    >
      <History size={12} strokeWidth={1.75} aria-hidden />
      {age}
    </span>
  )
}

export function MeasureNameCell({
  name,
  panel,
  logAction,
}: {
  name: string
  panel: MeasurementPanel
  logAction?: ReactNode
}) {
  const proofSource =
    panel.kind === 'metric'
      ? panel.metric
      : todoMeasureItems(panel).find((todo) =>
          proofParts(todo.proofUrl, todo.comment).hasProof,
        )
  const proofUrl = proofSource?.proofUrl

  return (
    <div className="pd-goals-table__name-cell pd-goals-table__name-cell--measure">
      <span className="pd-goals-table__branch" aria-hidden />
      <MeasureKindIcon
        kind={panel.kind === 'metric' ? 'metric' : 'milestone'}
      />
      <span className="pd-goals-table__measure-name" title={name}>
        {name}
      </span>
      {proofParts(proofUrl).href ? (
        <MeasureProofReadout proofUrl={proofUrl} />
      ) : null}
      {logAction}
    </div>
  )
}

export type GoalsTableRow = {
  goal: Goal
  title: string
  /** Set only when the table spans several people, e.g. a manager's reports. */
  owner?: { id: string; name: string; avatarUrl?: string }
  /** Submit blocker for this goal — title issues sit on the name, measure issues in Metrics. */
  issue?: string
}

export function GoalIssueIcon({
  issue,
  className,
}: {
  issue: string
  className?: string
}) {
  const label = isMeasureGoalIssue(issue) ? measureIssueLabel(issue) : issue
  return (
    <Tooltip content={label} side="top" portal delayMs={80} className={className}>
      <span
        className="pd-goals-table__goal-error-icon"
        role="img"
        aria-label={label}
        tabIndex={0}
      >
        <CircleAlert size={13} strokeWidth={2.25} aria-hidden />
      </span>
    </Tooltip>
  )
}

function metricsColumnIssue(rows: GoalsTableRow[]): string | null {
  const labels = [
    ...new Set(
      rows.flatMap((row) => {
        if (!row.issue || !isMeasureGoalIssue(row.issue)) return []
        return [measureIssueLabel(row.issue)]
      }),
    ),
  ]
  return labels.length > 0 ? labels.join(' ') : null
}

export function GoalsTable({
  rows,
  onOpen,
  openGoalId,
  label = 'All goals',
  banner,
  leadBanner,
  cycleId,
  subjectId,
  canEditWeight = false,
  canCascade = false,
  canRemove = false,
  cascadeTargets = [],
  onDuplicate,
  onCascade,
  onRemove,
  onWeightChange,
  onMeasureWeightChange,
  onDistributeWeights,
  cascadeFrom,
  cascadeRecipientsFor,
  status,
  postWindowApprovalStage,
  canLogProgress = false,
  onRecordMetricProgress,
  onToggleMilestone,
}: {
  rows: GoalsTableRow[]
  onOpen?: (id: string, measureKey?: string) => void
  /** Goal whose right-hand window is open. Highlights that row (or the measure that opened it). */
  openGoalId?: string | null
  /** Set-level Action required — sits behind the table, peeking above. */
  banner?: ReactNode
  /** Sent back notice — wraps the action banner and table, peeking above both. */
  leadBanner?: ReactNode
  label?: string
  cycleId?: string
  subjectId?: string
  canEditWeight?: boolean
  canCascade?: boolean
  canRemove?: boolean
  cascadeTargets?: CascadeTarget[]
  onDuplicate?: (goalId: string) => void
  onCascade?: (goalId: string, reportIds: string[]) => void
  onRemove?: (goalId: string) => void
  onWeightChange?: (goalId: string, weight: number) => void
  onMeasureWeightChange?: (goalId: string, measurements: Measurement[]) => void
  onDistributeWeights?: (goals: Goal[]) => void
  cascadeFrom?: LineManagerCascade
  cascadeRecipientsFor?: (goalId: string) => CascadeRecipient[]
  status?: SubmissionStatus
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  canLogProgress?: boolean
  onRecordMetricProgress?: (
    goalId: string,
    metricId: string,
    nextValue: number | undefined,
  ) => void
  onToggleMilestone?: (
    goalId: string,
    milestoneId: string,
    complete: boolean,
  ) => void
}) {
  const showOwner = rows.some((row) => row.owner)
  const showActions = hasGoalActions({
    onDuplicate,
    onCascade,
    onRemove,
    canRemove,
    onViewActivity: Boolean(cycleId),
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [selectedMeasureKey, setSelectedMeasureKey] = useState<string | null>(null)
  const allocatedWeight = sumGoalWeights(rows.map((row) => row.goal))
  const unassignedWeight = hasUnassignedGoalWeight(rows.map((row) => row.goal))
  const weightIssue = goalWeightIssue(rows.map((row) => row.goal))
  const weightBalance =
    allocatedWeight === 100 && !unassignedWeight
      ? 'complete'
      : allocatedWeight > 100
        ? 'over'
        : 'short'
  const weightError = Boolean(weightIssue)
  const metricsHeadIssue = metricsColumnIssue(rows)
  const metricsError = Boolean(metricsHeadIssue)
  const statusChip = status
    ? batchStatusLabel(status, rows.length, postWindowApprovalStage)
    : null
  const canDistribute =
    weightError && Boolean(canEditWeight && onDistributeWeights) && rows.length > 0
  const distributeWeights = () => {
    if (!onDistributeWeights) return
    onDistributeWeights(distributeGoalWeights(rows.map((row) => row.goal)))
  }
  const toggleExpanded = (goalId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }

  const onMeasureWeightChangeRef = useRef(onMeasureWeightChange)
  onMeasureWeightChangeRef.current = onMeasureWeightChange
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const measurementLockKey = rows
    .map((row) => {
      const panels = measurementPanels(row.goal.measurements)
      return `${row.goal.id}:${panels.length}:${sumPanelWeights(row.goal.measurements)}`
    })
    .join('|')

  useEffect(() => {
    if (!openGoalId) setSelectedMeasureKey(null)
  }, [openGoalId])

  useEffect(() => {
    const persistMeasureWeights = onMeasureWeightChangeRef.current
    if (!canEditWeight || !persistMeasureWeights) return
    for (const row of rowsRef.current) {
      const locked = lockSoloMeasurementWeights(row.goal.measurements)
      if (locked !== row.goal.measurements) {
        persistMeasureWeights(row.goal.id, locked)
      }
    }
  }, [canEditWeight, measurementLockKey])
  const table = (
    <div
      className={`pd-goals-table${showOwner ? ' pd-goals-table--with-owner' : ''}${showActions ? ' pd-goals-table--with-actions' : ''
        }${weightError ? ' pd-goals-table--weight-error' : ''}${metricsError ? ' pd-goals-table--metric-error' : ''
        }`}
      role="table"
      aria-label={label}
    >
      <div className="pd-goals-table__head" role="row">
        {showOwner ? <div role="columnheader">Owner</div> : null}
        <div
          className={statusChip ? 'pd-goals-table__goals-head' : undefined}
          role="columnheader"
          aria-label={statusChip ? `Goals ${statusChip}` : undefined}
        >
          Goals
          {status && statusChip ? (
            <GoalStatusBadge status={status}>{statusChip}</GoalStatusBadge>
          ) : null}
        </div>
        <div
          className={`pd-goals-table__weight-head${weightError ? ' pd-goals-table__weight-head--error' : ''
            }`}
          role="columnheader"
          aria-label={
            rows.length > 0
              ? `Weight ${formatWeightReadout(allocatedWeight)}`
              : 'Weight'
          }
        >
          Weight
          {rows.length > 0 ? (
            <span
              className={`pd-goals-table__weight-head-total pd-goals-table__weight-head-total--${weightBalance}`}
              aria-hidden
            >
              {formatWeightReadout(allocatedWeight)}
            </span>
          ) : null}
          {weightIssue ? (
            <GoalIssueIcon
              issue={weightIssue}
              className="pd-goals-table__weight-error-icon"
            />
          ) : null}
          {canDistribute ? (
            <div className="pd-goals-table__distribute-pop">
              <p className="pd-goals-table__distribute-copy">
                Split 100% evenly across these goals.
              </p>
              <button
                type="button"
                className="pd-goals-table__distribute"
                onClick={(event) => {
                  event.stopPropagation()
                  distributeWeights()
                }}
              >
                <Scale size={14} strokeWidth={2} aria-hidden />
                Distribute evenly
              </button>
            </div>
          ) : null}
        </div>
        <div className="pd-goals-table__progress-head" role="columnheader">
          Progress
        </div>
        <div
          className={`pd-goals-table__metric-head${metricsError ? ' pd-goals-table__metric-head--error' : ''
            }`}
          role="columnheader"
          aria-label="Metrics"
        >
          Metrics
          {metricsHeadIssue ? (
            <GoalIssueIcon
              issue={metricsHeadIssue}
              className="pd-goals-table__metric-error-icon"
            />
          ) : null}
        </div>
        {showActions ? (
          <div className="pd-goals-table__actions-head" role="columnheader">
            <span className="pd-sr-only">Actions</span>
          </div>
        ) : null}
      </div>
      {rows.map(({ goal, title, owner, issue }) => {
        const metricsIssue = issue && isMeasureGoalIssue(issue) ? issue : undefined
        const titleIssue = issue && !metricsIssue ? issue : undefined
        const completion = Math.round(goalCompletion(goal))
        const openGoal = () => {
          setSelectedMeasureKey(null)
          onOpen?.(goal.id)
        }
        const openMeasure = (measureKey: string) => {
          setSelectedMeasureKey(measureKey)
          setExpandedIds((ids) => new Set(ids).add(goal.id))
          onOpen?.(goal.id, measureKey)
        }
        const panels = measurementPanels(goal.measurements)
        const isOpen = expandedIds.has(goal.id)
        const isGoalSelected = Boolean(onOpen && openGoalId === goal.id && !selectedMeasureKey)
        const openRow = onOpen
          ? {
            tabIndex: 0 as const,
            onClick: openGoal,
            onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openGoal()
              }
            },
          }
          : {}
        return (
          <div key={goal.id} className="pd-goals-table__group" role="rowgroup">
            <div
              className={['pd-goals-table__row', isGoalSelected ? 'is-selected' : '']
                .filter(Boolean)
                .join(' ')}
              role="row"
              {...openRow}
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
                <div className="pd-goals-table__name-cell">
                  {panels.length > 0 ? (
                    <button
                      type="button"
                      className="pd-goals-table__expand"
                      aria-expanded={isOpen}
                      aria-label={
                        isOpen ? `Collapse ${title}` : `Expand ${title}`
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleExpanded(goal.id)
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {isOpen ? (
                        <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
                      )}
                    </button>
                  ) : (
                    <span className="pd-goals-table__expand-spacer" aria-hidden />
                  )}
                  <GoalCascadeIndicator
                    goal={goal}
                    cascadeFrom={cascadeFrom}
                    cascadedTo={cascadeRecipientsFor?.(goal.id)}
                    place="before"
                  />
                  <span
                    className={
                      titleIssue
                        ? 'pd-goals-table__title pd-goals-table__title--error'
                        : 'pd-goals-table__title'
                    }
                    title={title}
                  >
                    {title}
                    <GoalCascadeIndicator
                      goal={goal}
                      cascadeFrom={cascadeFrom}
                      cascadedTo={cascadeRecipientsFor?.(goal.id)}
                      place="after"
                    />
                    {titleIssue ? <GoalIssueIcon issue={titleIssue} /> : null}
                  </span>
                </div>
              </div>
              <div className="pd-goals-table__weight" role="cell">
                {canEditWeight && onWeightChange ? (
                  <WeightHoverField
                    weight={goal.weight}
                    ariaLabel={`Weight for ${title}`}
                    maxWeight={Math.max(
                      0,
                      100 - (allocatedWeight - goal.weight),
                    )}
                    onChange={(weight) => {
                      const maxWeight = Math.max(
                        0,
                        100 - (allocatedWeight - goal.weight),
                      )
                      onWeightChange(goal.id, Math.min(weight, maxWeight))
                    }}
                  />
                ) : (
                  <span className="pd-goals-table__weight-pill">
                    {formatWeightReadout(goal.weight)}
                  </span>
                )}
              </div>
              <div className="pd-goals-table__progress" role="cell">
                <div className="pd-goals-table__progress-meta">
                  <GoalProgressAge at={goalLastUpdatedAt(goal)} />
                  <span className="pd-goals-table__progress-label">
                    {completion}%
                  </span>
                </div>
                <Progress value={completion} />
              </div>
              <div
                className={
                  metricsIssue
                    ? 'pd-goals-table__metric pd-goals-table__metric--error'
                    : 'pd-goals-table__metric'
                }
                role="cell"
              >
                <span className="pd-goals-table__metric-cluster">
                  {metricsIssue ? <GoalIssueIcon issue={metricsIssue} /> : null}
                  {panels.length > 0 ? (
                    <MetricsCountBadge count={panels.length} />
                  ) : null}
                </span>
              </div>
              {showActions ? (
                <div
                  className="pd-goals-table__actions"
                  role="cell"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <GoalActionsMenu
                    variant="menu"
                    label={`More actions for ${title}`}
                    canCascade={canCascade}
                    canRemove={canRemove}
                    cascadeTargets={cascadeTargets}
                    activityFilters={
                      cycleId
                        ? {
                          goalId: goal.id,
                          cycleId,
                          subjectEmployeeId: subjectId
                            ? Number(subjectId)
                            : owner?.id
                              ? Number(owner.id)
                              : undefined,
                        }
                        : undefined
                    }
                    onDuplicate={
                      onDuplicate ? () => onDuplicate(goal.id) : undefined
                    }
                    onCascade={
                      onCascade
                        ? (reportIds) => onCascade(goal.id, reportIds)
                        : undefined
                    }
                    onRemove={onRemove ? () => onRemove(goal.id) : undefined}
                  />
                </div>
              ) : null}
            </div>
            {isOpen
              ? panels.map((panel) => {
                const measureName = measurePanelName(panel) || 'Metric'
                const measureProgress = measurePanelProgress(panel)
                const measureWeight = measurePanelTableWeight(
                  panel,
                  panels.length,
                )
                const allocatedMeasureWeight = sumPanelWeights(
                  goal.measurements,
                )
                const maxMeasureWeight = Math.max(
                  0,
                  100 - (allocatedMeasureWeight - measureWeight),
                )
                const canEditThisMeasure =
                  canEditWeight &&
                  Boolean(onMeasureWeightChange) &&
                  canEditMeasurementWeights(goal.measurements)
                const logHover = {
                  measureName,
                  entries: measurePanelProgressLog(panel),
                  metric:
                    panel.kind === 'metric' ? panel.metric : undefined,
                  lists:
                    panel.kind === 'todo_measure' ? panel.lists : undefined,
                  canLog:
                    canLogProgress &&
                    (panel.kind === 'metric'
                      ? Boolean(onRecordMetricProgress)
                      : Boolean(onToggleMilestone)),
                  onRecord:
                    panel.kind === 'metric' && onRecordMetricProgress
                      ? (nextValue: number | undefined) =>
                        onRecordMetricProgress(
                          goal.id,
                          panel.metric.id,
                          nextValue,
                        )
                      : undefined,
                  onToggleTodo:
                    panel.kind === 'todo_measure' && onToggleMilestone
                      ? (todoId: string, complete: boolean) =>
                        onToggleMilestone(goal.id, todoId, complete)
                      : undefined,
                }
                const isMeasureSelected = Boolean(
                  onOpen && openGoalId === goal.id && selectedMeasureKey === panel.key,
                )
                const measureOpenRow = onOpen
                  ? {
                    tabIndex: 0 as const,
                    onClick: () => openMeasure(panel.key),
                    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openMeasure(panel.key)
                      }
                    },
                  }
                  : {}
                return (
                  <div
                    key={panel.key}
                    className={[
                      'pd-goals-table__row',
                      'pd-goals-table__row--measure',
                      isMeasureSelected ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="row"
                    {...measureOpenRow}
                  >
                    {showOwner ? (
                      <div className="pd-goals-table__owner" role="cell" />
                    ) : null}
                    <div className="pd-goals-table__goal" role="cell">
                      <MeasureNameCell
                        name={measureName}
                        panel={panel}
                        logAction={<GoalMeasureLogHover {...logHover} />}
                      />
                    </div>
                    <div className="pd-goals-table__weight" role="cell">
                      {canEditThisMeasure ? (
                        <WeightHoverField
                          weight={measureWeight}
                          ariaLabel={`Weight for ${measureName}`}
                          maxWeight={maxMeasureWeight}
                          onChange={(weight) => {
                            onMeasureWeightChange?.(
                              goal.id,
                              setMeasurementPanelWeight(
                                goal.measurements,
                                panel.key,
                                Math.min(weight, maxMeasureWeight),
                              ),
                            )
                          }}
                        />
                      ) : (
                        <span className="pd-goals-table__weight-pill">
                          {formatWeightReadout(measureWeight)}
                        </span>
                      )}
                    </div>
                    <div className="pd-goals-table__progress" role="cell">
                      <div className="pd-goals-table__progress-meta">
                        <GoalProgressAge
                          at={measurePanelLatestProgressAt(panel)}
                        />
                        <span className="pd-goals-table__progress-label">
                          {measureProgress}%
                        </span>
                      </div>
                      <Progress value={measureProgress} />
                    </div>
                    <div className="pd-goals-table__metric" role="cell">
                      <div className="pd-goals-table__metric-line">
                        <GoalMeasureReadout panel={panel} />
                      </div>
                    </div>
                    {showActions ? (
                      <div className="pd-goals-table__actions" role="cell" />
                    ) : null}
                  </div>
                )
              })
              : null}
          </div>
        )
      })}
    </div>
  )

  const withAction = banner ? (
    <div className="pd-goals-table-wrap pd-goals-table-wrap--action">
      {banner}
      {table}
    </div>
  ) : (
    table
  )

  if (!leadBanner) return withAction

  return (
    <div className="pd-goals-table-wrap pd-goals-table-wrap--sendback">
      {leadBanner}
      {withAction}
    </div>
  )
}
