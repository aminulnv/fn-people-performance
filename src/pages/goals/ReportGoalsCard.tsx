import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, MoreHorizontal, Plus, Target, Undo2 } from 'lucide-react'
import { useHoverMenu } from '@/layout/useHoverMenu'
import {
  ActivityLogDrawer,
} from '@/components/activity/ActivityLogDrawer'
import { Avatar, Button, EmptyState, Textarea } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { cx } from '@/lib/cx'
import type { PersonGoals } from '@/lib/goals/types'
import '@/styles/layout-activity.css'
import { goalCountLabel } from './approvalDisplay'
import {
  buildApprovalTrail,
  type ApprovalTrailModel,
  type ApprovalTrailPerson,
} from './approvalTrail'
import { GoalStatusBadge } from './GoalStatusBadge'
import { goalsDetailPath } from './goalHelpers'
import {
  reportGoalsEmptyDescription,
  submissionStatusLabel,
} from './statusLabels'

export function ReportGoalsEmpty({
  personName,
  canAdd = false,
  busy = false,
  onAdd,
}: {
  personName: string
  canAdd?: boolean
  busy?: boolean
  onAdd?: () => void
}) {
  return (
    <EmptyState
      className="pd-goals__empty"
      icon={Target}
      title="No goals yet"
      description={reportGoalsEmptyDescription(personName, canAdd)}
      action={
        canAdd && onAdd ? (
          <Button
            variant="primary"
            size="sm"
            pill
            disabled={busy}
            onClick={onAdd}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Add Goal
          </Button>
        ) : undefined
      }
    />
  )
}

export type GoalsCardPerson = { id?: string | null; name: string; avatarUrl?: string }

type ReportGoalsCardProps = {
  person: GoalsCardPerson
  /** Lets the name open that person's goals. */
  cycleId?: string
  status: PersonGoals['status']
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  /** Named when a late submission still needs skip-level sign-off after this manager. */
  skipLevelManager?: GoalsCardPerson | null
  /** Direct manager — shown on the owner's card as the first approver. */
  lineManager?: GoalsCardPerson | null
  goalCount: number
  /** Reviewer sees Approve / Send Back. Owner sees Submit All / Add Goal. */
  perspective?: 'reviewer' | 'owner'
  /** Owner drafting after the window closed — two-tier approval will apply. */
  allowLateSubmissions?: boolean
  canApprove?: boolean
  canSendBack?: boolean
  busy?: boolean
  sendBackOpen?: boolean
  sendBackReason?: string
  onToggleSendBack?: () => void
  onSendBackReason?: (value: string) => void
  onApprove?: () => void
  onSendBack?: () => void
  /** Replaces Approve / Send Back — Submit All and Add Goal for the owner. */
  actions?: ReactNode
  /** Quiet overflow destination — never beside Approve / Send Back. */
  activityFilters?: {
    cycleId?: string
    subjectEmployeeId?: number
    entityType?: string
  }
  children: ReactNode
}

function ApproverChip({
  person,
  muted,
}: {
  person: ApprovalTrailPerson
  muted?: boolean
}) {
  const inner = (
    <>
      <Avatar
        name={person.name}
        src={person.avatarUrl}
        size="sm"
        className="pd-goals-approval__late-avatar"
        alt=""
        style={avatarStyle(person.name)}
      />
      <span className="pd-goals-approval__late-name">{person.name}</span>
    </>
  )
  const className = cx(
    'pd-goals-approval__late-person',
    muted && 'pd-goals-approval__late-person--muted',
  )

  if (!person.id) {
    return <span className={className}>{inner}</span>
  }

  return (
    <Link
      to={`/people/${person.id}`}
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      {inner}
    </Link>
  )
}

function ApprovalTrail({ model }: { model: ApprovalTrailModel }) {
  return (
    <span className="pd-goals-approval__path">
      {model.late ? (
        <span className="pd-goals-approval__late-flag" aria-hidden>
          Late submission
        </span>
      ) : null}
      {model.late ? (
        <span className="pd-goals-approval__path-dot" aria-hidden>
          ·
        </span>
      ) : null}
      <ol className="pd-goals-approval__trail" aria-label={model.spoken}>
        {model.stages.map((stage, index) => {
          const current = index === model.currentIndex
          return (
            <Fragment key={stage.key}>
              {index > 0 ? (
                <li className="pd-goals-approval__trail-sep" aria-hidden>
                  <ChevronRight size={12} strokeWidth={2.25} />
                </li>
              ) : null}
              <li
                className={cx(
                  'pd-goals-approval__trail-step',
                  current
                    ? 'pd-goals-approval__trail-step--current'
                    : 'pd-goals-approval__trail-step--upcoming',
                )}
              >
                {stage.person ? (
                  <ApproverChip person={stage.person} muted={!current} />
                ) : (
                  <span>{stage.label}</span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </span>
  )
}

/**
 * Nested review / submit card: person + batch actions, with that person's
 * goals underneath. Used for My Reports, a manager opening a report, and the
 * employee's own submit view.
 */
export function ReportGoalsCard({
  person,
  cycleId,
  status,
  postWindowApprovalStage,
  skipLevelManager,
  lineManager,
  goalCount,
  perspective = 'reviewer',
  allowLateSubmissions = false,
  canApprove = false,
  canSendBack = false,
  busy = false,
  sendBackOpen = false,
  sendBackReason = '',
  onToggleSendBack,
  onSendBackReason,
  onApprove,
  onSendBack,
  actions,
  activityFilters,
  children,
}: ReportGoalsCardProps) {
  const {
    open: menuOpen,
    setOpen: setMenuOpen,
    containerRef: menuRef,
    hoverHandlers: menuHoverHandlers,
    toggle: toggleMenu,
  } = useHoverMenu({ closeOnEscape: true })
  const [activityOpen, setActivityOpen] = useState(false)
  const isOwner = perspective === 'owner'
  const countLabel = goalCountLabel(goalCount)
  const awaitsApproval = status === 'submitted'
  const canViewActivity = Boolean(activityFilters)
  const showReviewActions = !isOwner && (canApprove || canSendBack)
  const showStatusBadge = !actions && !showReviewActions

  const awaitingApprovalLabel =
    !isOwner && awaitsApproval && canApprove
      ? `${countLabel} awaiting your approval`
      : null
  const subtitle = isOwner || awaitingApprovalLabel
    ? null
    : awaitsApproval && postWindowApprovalStage === 'manager_manager'
      ? `${countLabel} · Pending final approval`
      : showStatusBadge
        ? goalCount === 0
          ? null
          : countLabel
        : `${countLabel} · ${submissionStatusLabel(status, goalCount)}`
  const personHref =
    person.id && cycleId ? goalsDetailPath(cycleId, person.id) : null
  const trail = buildApprovalTrail({
    perspective: isOwner ? 'owner' : 'reviewer',
    status,
    postWindowApprovalStage,
    allowLateSubmissions,
    canApprove,
    lineManager,
    skipLevelManager,
  })

  return (
    <div className="pd-goals-approval-wrap">
      {trail ? <ApprovalTrail model={trail} /> : null}
      <section
        className={cx(
          'pd-goals-approval',
          goalCount === 0 && 'pd-goals-approval--empty',
        )}
        aria-label={`${person.name} goals`}
      >
      <div className="pd-goals-approval__head">
        <div className="pd-goals-approval__who">
          <Avatar
            name={person.name}
            src={person.avatarUrl || undefined}
            size="sm"
          />
          <div className="pd-goals-approval__text">
            {personHref ? (
              <Link
                to={personHref}
                className="pd-goals-approval__name"
                onClick={(event) => event.stopPropagation()}
              >
                {person.name}
              </Link>
            ) : (
              <span className="pd-goals-approval__name">{person.name}</span>
            )}
            {subtitle ? (
              <span className="pd-goals-approval__sub">{subtitle}</span>
            ) : null}
          </div>
        </div>
        <div className="pd-goals__footer-actions">
          {actions}
          {awaitingApprovalLabel ? (
            <span className="pd-goals-approval__sub">{awaitingApprovalLabel}</span>
          ) : null}
          {showReviewActions && canApprove ? (
            <button
              type="button"
              className="pd-people__ghost-btn pd-people__ghost-btn--success"
              disabled={busy}
              onClick={onApprove}
            >
              <Check size={16} strokeWidth={1.75} aria-hidden />
              Approve
            </button>
          ) : null}
          {showReviewActions && canSendBack ? (
            <button
              type="button"
              className="pd-people__ghost-btn"
              disabled={busy}
              aria-expanded={sendBackOpen}
              onClick={onToggleSendBack}
            >
              <Undo2 size={16} strokeWidth={1.75} aria-hidden />
              Send Back
            </button>
          ) : null}
          {showStatusBadge ? (
            <GoalStatusBadge status={status}>
              {submissionStatusLabel(status, goalCount)}
            </GoalStatusBadge>
          ) : null}
          {canViewActivity ? (
            <div
              className="pd-goal-view__menu"
              ref={menuRef}
              {...menuHoverHandlers}
            >
              <button
                type="button"
                className="pd-people__icon-btn"
                aria-label={`More actions for ${person.name}`}
                aria-expanded={menuOpen}
                onClick={toggleMenu}
              >
                <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
              </button>
              {menuOpen ? (
                <div className="pd-goal-view__menu-panel" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="pd-goal-view__menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      setActivityOpen(true)
                    }}
                  >
                    View activity
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {canViewActivity && activityFilters ? (
        <ActivityLogDrawer
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
          title="Activity"
          filters={activityFilters}
        />
      ) : null}
      {sendBackOpen ? (
        <div className="pd-goals-approval__reason">
          <Textarea
            label="Send back reason"
            value={sendBackReason}
            onChange={(event) => onSendBackReason?.(event.target.value)}
            placeholder={`Tell ${person.name} what to revise`}
            rows={2}
          />
          <div className="pd-goals__footer-actions">
            <button
              type="button"
              className="pd-people__ghost-btn"
              disabled={busy || !sendBackReason.trim()}
              onClick={onSendBack}
            >
              Confirm Send Back
            </button>
          </div>
        </div>
      ) : null}
      <div className="pd-goals-approval__goals">{children}</div>
    </section>
    </div>
  )
}
