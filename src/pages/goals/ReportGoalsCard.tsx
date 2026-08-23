import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, MoreHorizontal, Undo2 } from 'lucide-react'
import { useHoverMenu } from '@/layout/useHoverMenu'
import {
  ActivityLogDrawer,
} from '@/components/activity/ActivityLogDrawer'
import { Avatar, Badge, Textarea } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PersonGoals } from '@/lib/goals/types'
import '@/styles/layout-activity.css'
import { goalCountLabel } from './approvalDisplay'
import { statusVariant, submissionStatusLabel } from './statusLabels'

export type GoalsCardPerson = { id?: string | null; name: string; avatarUrl?: string }

type ReportGoalsCardProps = {
  person: { name: string; avatarUrl?: string }
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

function ApproverChip({ person }: { person: GoalsCardPerson }) {
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

  if (!person.id) {
    return <span className="pd-goals-approval__late-person">{inner}</span>
  }

  return (
    <Link
      to={`/people/${person.id}`}
      className="pd-goals-approval__late-person"
      onClick={(event) => event.stopPropagation()}
    >
      {inner}
    </Link>
  )
}

function StepLine({
  late,
  children,
}: {
  late?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={
        late ? 'pd-goals-approval__late' : 'pd-goals-approval__step'
      }
    >
      {children}
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
  const showFirstStageLate =
    status === 'submitted' && postWindowApprovalStage === 'manager'
  const showFinalStageLate =
    status === 'submitted' && postWindowApprovalStage === 'manager_manager'
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
      : `${countLabel} · ${submissionStatusLabel(status, goalCount)}`

  return (
    <section className="pd-goals-approval" aria-label={`${person.name} goals`}>
      <div className="pd-goals-approval__head">
        <div className="pd-goals-approval__who">
          <Avatar
            name={person.name}
            src={person.avatarUrl || undefined}
            size="sm"
          />
          <div className="pd-goals-approval__text">
            <span className="pd-goals-approval__name">{person.name}</span>
            {subtitle ? (
              <span className="pd-goals-approval__sub">{subtitle}</span>
            ) : null}
            {isOwner ? (
              <OwnerApprovalSteps
                status={status}
                postWindowApprovalStage={postWindowApprovalStage}
                allowLateSubmissions={allowLateSubmissions}
                lineManager={lineManager}
                skipLevelManager={skipLevelManager}
              />
            ) : (
              <ReviewerApprovalSteps
                showFirstStageLate={showFirstStageLate}
                showFinalStageLate={showFinalStageLate}
                canApprove={canApprove}
                skipLevelManager={skipLevelManager}
              />
            )}
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
            <Badge variant={statusVariant(status)}>
              {submissionStatusLabel(status, goalCount)}
            </Badge>
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
                    View submission activity
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
          title="Submission activity"
          filters={{
            entityType: 'goal_submission',
            ...activityFilters,
          }}
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
  )
}

function ReviewerApprovalSteps({
  showFirstStageLate,
  showFinalStageLate,
  canApprove,
  skipLevelManager,
}: {
  showFirstStageLate: boolean
  showFinalStageLate: boolean
  canApprove: boolean
  skipLevelManager?: GoalsCardPerson | null
}) {
  return (
    <>
      {showFirstStageLate ? (
        <StepLine late>
          Late submission
          {canApprove && skipLevelManager ? (
            <>
              {' · '}
              <ApproverChip person={skipLevelManager} />
              {' will approve after you'}
            </>
          ) : canApprove ? (
            ' · skip-level manager will approve after you'
          ) : skipLevelManager ? (
            <>
              {' · awaiting direct manager approval, then '}
              <ApproverChip person={skipLevelManager} />
              {' gives final approval'}
            </>
          ) : (
            ' · awaiting direct manager, then skip-level approval'
          )}
        </StepLine>
      ) : null}
      {showFinalStageLate ? (
        <StepLine late>
          Late submission
          {canApprove ? (
            ' · your approval is final'
          ) : skipLevelManager ? (
            <>
              {' · awaiting '}
              <ApproverChip person={skipLevelManager} />
              {"'s final approval"}
            </>
          ) : (
            ' · awaiting skip-level final approval'
          )}
        </StepLine>
      ) : null}
    </>
  )
}

function OwnerApprovalSteps({
  status,
  postWindowApprovalStage,
  allowLateSubmissions,
  lineManager,
  skipLevelManager,
}: {
  status: PersonGoals['status']
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  allowLateSubmissions: boolean
  lineManager?: GoalsCardPerson | null
  skipLevelManager?: GoalsCardPerson | null
}) {
  const managerChip = lineManager ? <ApproverChip person={lineManager} /> : null
  const skipChip = skipLevelManager ? (
    <ApproverChip person={skipLevelManager} />
  ) : null
  const twoTier = allowLateSubmissions || Boolean(postWindowApprovalStage)
  const drafting = status === 'draft' || status === 'sent_back'

  if (status === 'submitted' && postWindowApprovalStage === 'manager_manager') {
    return (
      <StepLine late>
        Late submission
        {skipChip ? (
          <>
            {' · awaiting '}
            {skipChip}
            {"'s final approval"}
          </>
        ) : (
          ' · awaiting skip-level final approval'
        )}
      </StepLine>
    )
  }

  if (status === 'submitted' && postWindowApprovalStage === 'manager') {
    return (
      <StepLine late>
        Late submission
        {managerChip && skipChip ? (
          <>
            {' · awaiting '}
            {managerChip}
            {' approval, then '}
            {skipChip}
            {' gives final approval'}
          </>
        ) : skipChip ? (
          <>
            {' · awaiting direct manager approval, then '}
            {skipChip}
            {' gives final approval'}
          </>
        ) : (
          ' · awaiting direct manager, then skip-level approval'
        )}
      </StepLine>
    )
  }

  if (status === 'submitted') {
    return managerChip ? (
      <StepLine>
        Awaiting {managerChip} approval
      </StepLine>
    ) : (
      <StepLine>Awaiting manager approval</StepLine>
    )
  }

  if (drafting && twoTier) {
    return (
      <StepLine late>
        Late submission
        {managerChip && skipChip ? (
          <>
            {' · '}
            {managerChip}
            {' will approve after you, then '}
            {skipChip}
            {' gives final approval'}
          </>
        ) : managerChip ? (
          <>
            {' · '}
            {managerChip}
            {' will approve after you, then skip-level gives final approval'}
          </>
        ) : (
          ' · your manager will approve after you, then skip-level gives final approval'
        )}
      </StepLine>
    )
  }

  if (drafting && managerChip) {
    return (
      <StepLine>
        {managerChip}
        {' will approve after you submit'}
      </StepLine>
    )
  }

  return null
}
