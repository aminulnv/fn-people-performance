import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, History, MoreHorizontal, Plus, Target, Undo2 } from 'lucide-react'
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
import { formatRefreshAge, goalsDetailPath } from './goalHelpers'
import {
  reportGoalsEmptyDescription,
  submissionStatusLabel,
} from './statusLabels'

export function ReportGoalsEmpty({
  personName,
  canAdd = false,
  busy = false,
  lockMessage,
  onAdd,
}: {
  personName: string
  canAdd?: boolean
  busy?: boolean
  /** Same closed / not-open copy My Goals uses when the set cannot start. */
  lockMessage?: string | null
  onAdd?: () => void
}) {
  return (
    <EmptyState
      className="pd-goals__empty"
      icon={Target}
      title="No Goals Yet"
      description={
        !canAdd && lockMessage
          ? lockMessage
          : reportGoalsEmptyDescription(personName, canAdd)
      }
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
  /** Drafting after the window closed — two-tier approval will apply. */
  allowLateSubmissions?: boolean
  /** Goal-window end used for “Deadline Missed: 5d ago”. */
  deadlineMissedAt?: string
  /** Why the employee submitted after the deadline. */
  lateJustification?: string
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
  /** Closed-cycle / ineligibility ribbon — same slot as Late Submission. */
  lockBanner?: ReactNode
  /** Cycle ineligibility should not be hidden by a late-submission trail. */
  preferLockBanner?: boolean
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

function deadlineMissedCopy(deadline?: string): string | null {
  if (!deadline) return null
  const iso = deadline.includes('T') ? deadline : `${deadline}T12:00:00.000Z`
  const age = formatRefreshAge(iso)
  if (age === '—' || age === 'Just now') return 'Deadline missed'
  return `Deadline Missed: ${age} ago`
}

function ApprovalTrailSteps({
  model,
  stages,
}: {
  model: ApprovalTrailModel
  stages: ApprovalTrailModel['stages']
}) {
  return (
    <ol className="pd-goals-approval__trail" aria-label={model.spoken}>
      {stages.map((stage, index) => {
        const current = model.stages.indexOf(stage) === model.currentIndex
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
  )
}

function ApprovalTrail({ model }: { model: ApprovalTrailModel }) {
  return (
    <span className="pd-goals-approval__path">
      <ApprovalTrailSteps model={model} stages={model.stages} />
    </span>
  )
}

function LateSubmissionBanner({
  model,
  deadlineMissedAt,
  lateJustification,
}: {
  model: ApprovalTrailModel
  deadlineMissedAt?: string
  lateJustification?: string
}) {
  const namedApprovers = model.stages.filter((stage) => stage.key !== 'you')
  const approvers = namedApprovers.length > 0 ? namedApprovers : model.stages
  const missed = deadlineMissedCopy(deadlineMissedAt)
  const approvalLabel =
    approvers.length > 1
      ? `${approvers.length} Level Approval Required:`
      : 'Approval Required:'

  return (
    <aside
      className="pd-goals-banner pd-goals-banner--late"
      aria-label="Late Submission"
    >
      <div className="pd-goals-banner__start">
        <span className="pd-goals-banner__icon" aria-hidden>
          <History size={13} strokeWidth={2.25} />
        </span>
        <p className="pd-goals-banner__title">Late Submission</p>
        {missed ? <p className="pd-goals-banner__detail">{missed}</p> : null}
      </div>
      {approvers.length > 0 ? (
        <div className="pd-goals-banner__end">
          <p className="pd-goals-banner__detail">{approvalLabel}</p>
          <ApprovalTrailSteps model={model} stages={approvers} />
        </div>
      ) : null}
      {lateJustification ? (
        <p className="pd-goals-banner__reason">
          <span className="pd-goals-banner__reason-label">Reason</span>
          {lateJustification}
        </p>
      ) : null}
    </aside>
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
  deadlineMissedAt,
  lateJustification,
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
  lockBanner,
  preferLockBanner = false,
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
    lineManager,
    skipLevelManager,
  })
  const showLockBanner =
    Boolean(lockBanner) && (preferLockBanner || !trail?.late)

  return (
    <div
      className={cx(
        'pd-goals-approval-wrap',
        trail?.late && !showLockBanner && 'pd-goals-approval-wrap--late',
        showLockBanner && 'pd-goals-approval-wrap--lock',
      )}
    >
      {showLockBanner && lockBanner ? (
        lockBanner
      ) : trail?.late ? (
        <LateSubmissionBanner
          model={trail}
          deadlineMissedAt={deadlineMissedAt}
          lateJustification={lateJustification}
        />
      ) : null}
      {trail && !trail.late && !showLockBanner ? (
        <ApprovalTrail model={trail} />
      ) : null}
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
                aria-label={`More Actions For ${person.name}`}
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
                    View Activity
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
