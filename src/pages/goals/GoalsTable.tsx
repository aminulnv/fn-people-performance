import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  CornerDownRight,
  CornerLeftDown,
  History,
  Scale,
} from 'lucide-react'
import { Avatar, CountBadge, Progress, Tooltip } from '@/components/ui'
import {
  distributeGoalWeights,
  goalCompletion,
  goalWeightIssue,
  hasUnassignedGoalWeight,
  measurementWeightIssue,
  sumGoalWeights,
  isMeasureGoalIssue,
  measureIssueLabel,
  type Goal,
  type PersonGoals,
  type SubmissionStatus,
} from '@/lib/goalsApi'
import {
  canEditMeasurementWeights,
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
import { MeasureProofReadout } from '@/pages/goals/MeasureProofFields'
import { MeasureKindIcon } from '@/pages/goals/MeasureKindIcon'
import {
  GoalMeasureGlance,
  WeightHoverField,
  formatWeightReadout,
} from '@/pages/goals/GoalMeasurementReadout'
import {
  GoalProgressInfo,
  GoalProgressInfoTip,
} from '@/pages/goals/GoalProgressInfo'
import {
  CascadeGoalTip,
  selectedCascadePerson,
} from '@/pages/goals/GoalCascadeField'
import type { CascadeTarget } from '@/pages/goals/GoalCascadeTargetDialog'
import type { DuplicateCycleOption } from '@/pages/goals/GoalDuplicateCycleDialog'
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
    <Tooltip
      content={content}
      side="top"
      portal
      delayMs={80}
      className={className}
    >
      <span role="img" aria-label={label} tabIndex={0}>
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

/**
 * Tiny “Cascaded from / to” labels above and below the goal name - same
 * language as the goals window - without shifting the name in the layout.
 */
export function GoalCascadeName({
  goal,
  cascadeFrom,
  cascadedTo = [],
  children,
}: {
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>
  cascadeFrom?: LineManagerCascade
  cascadedTo?: CascadeRecipient[]
  children: ReactNode
}) {
  const selected = cascadeFrom
    ? selectedCascadePerson(goal, cascadeFrom)
    : null
  const fromPerson =
    selected?.managerName?.trim() ||
    cascadeFrom?.managerName?.trim() ||
    ''
  const fromLabel = isCascadedGoal(goal)
    ? fromPerson
      ? `Cascaded from ${fromPerson}`
      : cascadeTableLabel(goal)
    : null
  const toLabel = cascadedTo.length > 0 ? cascadeToTableLabel(cascadedTo) : null
  if (!fromLabel && !toLabel) return <>{children}</>

  return (
    <span
      className={[
        'pd-goals-table__cascade-name',
        fromLabel ? 'pd-goals-table__cascade-name--from' : '',
        toLabel ? 'pd-goals-table__cascade-name--to' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {fromLabel ? (
        <CascadeIconTip
          label={fromLabel}
          className="pd-goals-table__cascade-line pd-goals-table__cascade-line--from"
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
          <CornerLeftDown size={10} strokeWidth={2.25} aria-hidden />
          {fromLabel}
        </CascadeIconTip>
      ) : null}
      <span className="pd-goals-table__cascade-name-core">{children}</span>
      {toLabel ? (
        <CascadeIconTip
          label={toLabel}
          className="pd-goals-table__cascade-line pd-goals-table__cascade-line--to"
          content={cascadedToTip(cascadedTo)}
        >
          <CornerDownRight size={10} strokeWidth={2.25} aria-hidden />
          {toLabel}
        </CascadeIconTip>
      ) : null}
    </span>
  )
}

function compactUpdateAge(iso?: string): string | null {
  if (!iso) return null
  const age = formatRefreshAge(iso)
  return age === '-' ? null : age
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

export function GoalWeightTree({
  limb,
  children,
}: {
  limb?: 'stem' | 'branch' | 'spacer'
  children: ReactNode
}) {
  return (
    <div
      className={[
        'pd-goals-table__weight-cell',
        limb === 'stem'
          ? 'pd-goals-table__weight-cell--stem'
          : limb === 'branch'
            ? 'pd-goals-table__weight-cell--branch'
            : limb === 'spacer'
              ? 'pd-goals-table__weight-cell--spacer'
              : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {limb === 'branch' ? (
        <span
          className="pd-goals-table__branch pd-goals-table__branch--weight"
          aria-hidden
        />
      ) : null}
      {children}
    </div>
  )
}

export function MeasureNameCell({
  name,
  panel,
}: {
  name: string
  panel: MeasurementPanel
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
      <Tooltip
        className="pd-goals-table__measure-name-tip"
        side="left"
        portal
        interactive
        delayMs={80}
        content={<GoalMeasureGlance panel={panel} />}
      >
        <span className="pd-goals-table__measure-name">{name}</span>
      </Tooltip>
      {proofParts(proofUrl).href ? (
        <MeasureProofReadout proofUrl={proofUrl} />
      ) : null}
    </div>
  )
}

export type GoalsTableRow = {
  goal: Goal
  title: string
  /** Set only when the table spans several people, e.g. a manager's reports. */
  owner?: { id: string; name: string; avatarUrl?: string }
  /** Submit blocker for this goal - shown on the goal name. */
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
  duplicateCycles = [],
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
  openMeasureKey,
}: {
  rows: GoalsTableRow[]
  onOpen?: (id: string, measureKey?: string) => void
  /** Goal whose right-hand window is open. Highlights that row (or the measure that opened it). */
  openGoalId?: string | null
  /** Measure that opened the window - keeps the metric row highlighted. */
  openMeasureKey?: string | null
  /** Set-level Action required - sits behind the table, peeking above. */
  banner?: ReactNode
  /** Sent back notice - wraps the action banner and table, peeking above both. */
  leadBanner?: ReactNode
  label?: string
  cycleId?: string
  subjectId?: string
  canEditWeight?: boolean
  canCascade?: boolean
  canRemove?: boolean
  cascadeTargets?: CascadeTarget[]
  duplicateCycles?: DuplicateCycleOption[]
  onDuplicate?: (goalId: string, cycleId: string) => void
  onCascade?: (goalId: string, reportIds: string[]) => void
  onRemove?: (goalId: string) => void
  onWeightChange?: (goalId: string, weight: number) => void
  onMeasureWeightChange?: (goalId: string, measurements: Measurement[]) => void
  onDistributeWeights?: (goals: Goal[]) => void
  cascadeFrom?: LineManagerCascade
  cascadeRecipientsFor?: (goalId: string) => CascadeRecipient[]
  status?: SubmissionStatus
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
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
  const [selectedMeasureKey, setSelectedMeasureKey] = useState<string | null>(
    () => openMeasureKey ?? null,
  )
  const activeMeasureKey =
    openMeasureKey !== undefined ? openMeasureKey : selectedMeasureKey
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
  const expandableIds = rows
    .filter((row) => measurementPanels(row.goal.measurements).length > 0)
    .map((row) => row.goal.id)
  const allExpanded =
    expandableIds.length > 0 &&
    expandableIds.every((id) => expandedIds.has(id))
  const toggleExpandAll = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(expandableIds))
  }

  useEffect(() => {
    if (!openGoalId) {
      setSelectedMeasureKey(null)
      return
    }
    if (openMeasureKey) {
      setSelectedMeasureKey(openMeasureKey)
      setExpandedIds((ids) => new Set(ids).add(openGoalId))
    }
  }, [openGoalId, openMeasureKey])

  const table = (
    <div
      className={`pd-goals-table${showOwner ? ' pd-goals-table--with-owner' : ''}${showActions ? ' pd-goals-table--with-actions' : ''
        }${weightError ? ' pd-goals-table--weight-error' : ''}`}
      role="table"
      aria-label={label}
    >
      <div className="pd-goals-table__head" role="row">
        {showOwner ? <div role="columnheader">Owner</div> : null}
        <div
          className={
            statusChip || expandableIds.length > 0
              ? 'pd-goals-table__goals-head'
              : undefined
          }
          role="columnheader"
          aria-label={statusChip ? `Goals ${statusChip}` : undefined}
        >
          Goals
          {expandableIds.length > 0 ? (
            <button
              type="button"
              className="pd-goals-table__expand pd-goals-table__expand--all"
              aria-expanded={allExpanded}
              aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
              title={allExpanded ? 'Collapse all' : 'Expand all'}
              onClick={toggleExpandAll}
            >
              {allExpanded ? (
                <ChevronsDownUp size={12} strokeWidth={2} aria-hidden />
              ) : (
                <ChevronsUpDown size={12} strokeWidth={2} aria-hidden />
              )}
            </button>
          ) : null}
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
                Distribute Evenly
              </button>
            </div>
          ) : null}
        </div>
        <div className="pd-goals-table__progress-head" role="columnheader">
          Progress
        </div>
        {showActions ? (
          <div className="pd-goals-table__actions-head" role="columnheader">
            <span className="pd-sr-only">Actions</span>
          </div>
        ) : null}
      </div>
      {rows.map(({ goal, title, owner, issue }) => {
        const titleIssue = issue
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
        const allocatedMeasureWeight = sumPanelWeights(goal.measurements)
        const measureWeightError = Boolean(
          measurementWeightIssue(goal.measurements),
        )
        const isGoalSelected = Boolean(
          onOpen && openGoalId === goal.id && !activeMeasureKey,
        )
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
                  <GoalCascadeName
                    goal={goal}
                    cascadeFrom={cascadeFrom}
                    cascadedTo={cascadeRecipientsFor?.(goal.id)}
                  >
                    <span
                      className={
                        titleIssue
                          ? 'pd-goals-table__title pd-goals-table__title--error'
                          : 'pd-goals-table__title'
                      }
                      title={title}
                    >
                      {title}
                      {titleIssue ? <GoalIssueIcon issue={titleIssue} /> : null}
                    </span>
                  </GoalCascadeName>
                </div>
              </div>
              <div className="pd-goals-table__weight" role="cell">
                <GoalWeightTree
                  limb={
                    panels.length > 0
                      ? isOpen
                        ? 'stem'
                        : 'spacer'
                      : undefined
                  }
                >
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
                </GoalWeightTree>
              </div>
              <div className="pd-goals-table__progress" role="cell">
                <div className="pd-goals-table__progress-meta">
                  <GoalProgressAge at={goalLastUpdatedAt(goal)} />
                  <GoalProgressInfo label={`Progress details for ${title}`}>
                    <GoalProgressInfoTip goal={goal} />
                  </GoalProgressInfo>
                  <span className="pd-goals-table__progress-label">
                    {completion}%
                  </span>
                </div>
                <Progress value={completion} />
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
                    label={`More Actions For ${title}`}
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
                      onDuplicate
                        ? (targetCycleId) => onDuplicate(goal.id, targetCycleId)
                        : undefined
                    }
                    duplicateCycles={duplicateCycles}
                    defaultDuplicateCycleId={cycleId}
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
                const maxMeasureWeight = Math.max(
                  0,
                  100 - (allocatedMeasureWeight - measureWeight),
                )
                const canEditThisMeasure =
                  canEditWeight &&
                  Boolean(onMeasureWeightChange) &&
                  canEditMeasurementWeights(goal.measurements)
                const isMeasureSelected = Boolean(
                  onOpen && openGoalId === goal.id && activeMeasureKey === panel.key,
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
                      measureWeightError
                        ? 'pd-goals-table__row--measure-weight-error'
                        : '',
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
                      />
                    </div>
                    <div className="pd-goals-table__weight" role="cell">
                      <GoalWeightTree limb="branch">
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
                      </GoalWeightTree>
                    </div>
                    <div className="pd-goals-table__progress" role="cell">
                      <div className="pd-goals-table__progress-meta">
                        <GoalProgressAge
                          at={measurePanelLatestProgressAt(panel)}
                        />
                        <GoalProgressInfo
                          label={`Progress details for ${measureName}`}
                        >
                          <GoalProgressInfoTip panel={panel} />
                        </GoalProgressInfo>
                        <span className="pd-goals-table__progress-label">
                          {measureProgress}%
                        </span>
                      </div>
                      <Progress value={measureProgress} />
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
