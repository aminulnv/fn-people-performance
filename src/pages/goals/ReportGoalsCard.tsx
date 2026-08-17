import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, MoreHorizontal, Undo2 } from 'lucide-react'
import {
  ActivityLogDrawer,
} from '@/components/activity/ActivityLogDrawer'
import { Avatar, Badge, Textarea } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PersonGoals } from '@/lib/goals/types'
import '@/styles/layout-activity.css'
import { statusVariant, submissionStatusLabel } from './statusLabels'

type ReportGoalsCardProps = {
  person: { name: string; avatarUrl?: string }
  status: PersonGoals['status']
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  /** Named when a late submission still needs skip-level sign-off after this manager. */
  skipLevelManager?: { id: string; name: string; avatarUrl?: string } | null
  goalCount: number
  canApprove: boolean
  canSendBack: boolean
  busy: boolean
  sendBackOpen: boolean
  sendBackReason: string
  onToggleSendBack: () => void
  onSendBackReason: (value: string) => void
  onApprove: () => void
  onSendBack: () => void
  /** Quiet overflow destination — never beside Approve / Send Back. */
  activityFilters?: {
    cycleId?: string
    subjectEmployeeId?: number
    entityType?: string
  }
  children: ReactNode
}

/**
 * Nested review card: person + batch actions, with that person's goals
 * underneath. Used on My Reports and when a manager opens a report's page.
 */
export function ReportGoalsCard({
  person,
  status,
  postWindowApprovalStage,
  skipLevelManager,
  goalCount,
  canApprove,
  canSendBack,
  busy,
  sendBackOpen,
  sendBackReason,
  onToggleSendBack,
  onSendBackReason,
  onApprove,
  onSendBack,
  activityFilters,
  children,
}: ReportGoalsCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const countLabel = `${goalCount} goal${goalCount === 1 ? '' : 's'}`
  const awaitsApproval = status === 'submitted'
  const showFirstStageLate =
    status === 'submitted' && postWindowApprovalStage === 'manager'
  const showFinalStageLate =
    status === 'submitted' && postWindowApprovalStage === 'manager_manager'
  const canViewActivity = Boolean(activityFilters)

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
            <span className="pd-goals-approval__sub">
              {awaitsApproval && canApprove
                ? `${countLabel} awaiting your approval`
                : awaitsApproval &&
                  postWindowApprovalStage === 'manager_manager'
                  ? `${countLabel} · Pending final approval`
                  : `${countLabel} · ${submissionStatusLabel(status, goalCount)}`}
            </span>
            {showFirstStageLate ? (
              <span className="pd-goals-approval__late">
                Late submission
                {canApprove && skipLevelManager ? (
                  <>
                    {' · '}
                    <Link
                      to={`/people/${skipLevelManager.id}`}
                      className="pd-goals-approval__late-person"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Avatar
                        name={skipLevelManager.name}
                        src={skipLevelManager.avatarUrl}
                        size="sm"
                        className="pd-goals-approval__late-avatar"
                        alt=""
                        style={avatarStyle(skipLevelManager.name)}
                      />
                      <span className="pd-goals-approval__late-name">
                        {skipLevelManager.name}
                      </span>
                    </Link>
                    {' will approve after you'}
                  </>
                ) : canApprove ? (
                  ' · skip-level manager will approve after you'
                ) : skipLevelManager ? (
                  <>
                    {' · awaiting direct manager approval, then '}
                    <Link
                      to={`/people/${skipLevelManager.id}`}
                      className="pd-goals-approval__late-person"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="pd-goals-approval__late-name">
                        {skipLevelManager.name}
                      </span>
                    </Link>
                    {' gives final approval'}
                  </>
                ) : (
                  ' · awaiting direct manager, then skip-level approval'
                )}
              </span>
            ) : null}
            {showFinalStageLate ? (
              <span className="pd-goals-approval__late">
                Late submission
                {canApprove ? (
                  ' · your approval is final'
                ) : skipLevelManager ? (
                  <>
                    {' · awaiting '}
                    <Link
                      to={`/people/${skipLevelManager.id}`}
                      className="pd-goals-approval__late-person"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Avatar
                        name={skipLevelManager.name}
                        src={skipLevelManager.avatarUrl}
                        size="sm"
                        className="pd-goals-approval__late-avatar"
                        alt=""
                        style={avatarStyle(skipLevelManager.name)}
                      />
                      <span className="pd-goals-approval__late-name">
                        {skipLevelManager.name}
                      </span>
                    </Link>
                    {"'s final approval"}
                  </>
                ) : (
                  ' · awaiting skip-level final approval'
                )}
              </span>
            ) : null}
          </div>
        </div>
        <div className="pd-goals__footer-actions">
          {canApprove ? (
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
          {canSendBack ? (
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
          {!canApprove && !canSendBack ? (
            <Badge variant={statusVariant(status)}>
              {submissionStatusLabel(status, goalCount)}
            </Badge>
          ) : null}
          {canViewActivity ? (
            <div className="pd-goal-view__menu">
              <button
                type="button"
                className="pd-people__icon-btn"
                aria-label={`More actions for ${person.name}`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
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
            onChange={(event) => onSendBackReason(event.target.value)}
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
