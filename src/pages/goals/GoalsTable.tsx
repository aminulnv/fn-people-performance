import { useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight, Hash, History, ListTodo } from 'lucide-react'
import { Avatar, CountBadge, Progress } from '@/components/ui'
import { goalCompletion, type Goal } from '@/lib/goalsApi'
import {
  measurementPanels,
  type MeasurementPanel,
} from '@/lib/goals/measurements'
import { formatProgressTimestamp, goalLastUpdatedAt } from '@/lib/goals/progressLog'
import { GoalActionsMenu, hasGoalActions } from '@/pages/goals/GoalActionsMenu'
import {
  BufferedWeightInput,
  GoalMeasureReadout,
  formatWeightReadout,
} from '@/pages/goals/GoalMeasurementReadout'
import type { CascadeTarget } from '@/pages/goals/GoalCascadeTargetDialog'
import { formatRefreshAge, metricCountLabel } from '@/pages/goals/goalHelpers'
import {
  measurePanelKindLabel,
  measurePanelLatestProgressAt,
  measurePanelName,
  measurePanelProgress,
} from '@/pages/goals/measurePanelDisplay'
import '@/styles/layout-goals.css'

export function MetricsCountBadge({ count }: { count: number }) {
  return (
    <CountBadge
      count={count}
      tone="muted"
      aria-label={metricCountLabel(count)}
    />
  )
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

function MeasureNameCell({
  name,
  panel,
}: {
  name: string
  panel: MeasurementPanel
}) {
  const kindLabel = measurePanelKindLabel(panel)
  const Icon = panel.kind === 'metric' ? Hash : ListTodo
  return (
    <div className="pd-goals-table__name-cell pd-goals-table__name-cell--measure">
      <span className="pd-goals-table__branch" aria-hidden />
      <span
        className="pd-goals-table__measure-icon"
        role="img"
        aria-label={kindLabel}
      >
        <Icon size={13} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="pd-goals-table__measure-name" title={name}>
        {name}
      </span>
    </div>
  )
}

export type GoalsTableRow = {
  goal: Goal
  title: string
  /** Set only when the table spans several people, e.g. a manager's reports. */
  owner?: { id: string; name: string; avatarUrl?: string }
}

export function GoalsTable({
  rows,
  onOpen,
  label = 'All goals',
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
}: {
  rows: GoalsTableRow[]
  onOpen?: (id: string) => void
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
  const toggleExpanded = (goalId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }
  return (
    <div
      className={`pd-goals-table${showOwner ? ' pd-goals-table--with-owner' : ''}${
        showActions ? ' pd-goals-table--with-actions' : ''
      }`}
      role="table"
      aria-label={label}
    >
      <div className="pd-goals-table__head" role="row">
        {showOwner ? <div role="columnheader">Owner</div> : null}
        <div role="columnheader">Goals</div>
        <div role="columnheader">Weight</div>
        <div role="columnheader">Progress</div>
        <div className="pd-goals-table__metric-head" role="columnheader">
          Metrics
        </div>
        {showActions ? (
          <div role="columnheader">
            <span className="pd-sr-only">Actions</span>
          </div>
        ) : null}
      </div>
      {rows.map(({ goal, title, owner }) => {
        const completion = Math.round(goalCompletion(goal))
        const openGoal = () => onOpen?.(goal.id)
        const panels = measurementPanels(goal.measurements)
        const isOpen = expandedIds.has(goal.id)
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
            <div className="pd-goals-table__row" role="row" {...openRow}>
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
                  <span className="pd-goals-table__title" title={title}>
                    {title}
                  </span>
                </div>
              </div>
              <div className="pd-goals-table__weight" role="cell">
                {canEditWeight && onWeightChange ? (
                  <div
                    className="pd-goals-table__weight-edit"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <BufferedWeightInput
                      weight={goal.weight}
                      ariaLabel={`Weight for ${title}`}
                      onChange={(weight) => onWeightChange(goal.id, weight)}
                    />
                    <span className="pd-goals-table__weight-suffix" aria-hidden>
                      %
                    </span>
                  </div>
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
              <div className="pd-goals-table__metric" role="cell">
                <MetricsCountBadge count={panels.length} />
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
                  const measureName = measurePanelName(panel) || 'Measure'
                  const measureProgress = measurePanelProgress(panel)
                  const measureWeight =
                    panel.kind === 'metric' ? panel.metric.weight : panel.weight
                  return (
                    <div
                      key={panel.key}
                      className="pd-goals-table__row pd-goals-table__row--measure"
                      role="row"
                      {...openRow}
                    >
                      {showOwner ? (
                        <div className="pd-goals-table__owner" role="cell" />
                      ) : null}
                      <div className="pd-goals-table__goal" role="cell">
                        <MeasureNameCell name={measureName} panel={panel} />
                      </div>
                      <div className="pd-goals-table__weight" role="cell">
                        <span className="pd-goals-table__weight-pill">
                          {formatWeightReadout(measureWeight)}
                        </span>
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
                        <GoalMeasureReadout panel={panel} />
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
}
