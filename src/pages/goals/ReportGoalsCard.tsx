import type { ReactNode } from 'react'
import { Check, Undo2 } from 'lucide-react'
import { Avatar, Badge, Textarea } from '@/components/ui'
import type { PersonGoals } from '@/lib/goals/types'
import { statusLabel, statusVariant } from './statusLabels'

type ReportGoalsCardProps = {
  person: { name: string; avatarUrl?: string }
  status: PersonGoals['status']
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
  children: ReactNode
}

/**
 * Nested review card: person + batch actions, with that person's goals
 * underneath. Used on My Reports and when a manager opens a report's page.
 */
export function ReportGoalsCard({
  person,
  status,
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
  children,
}: ReportGoalsCardProps) {
  const countLabel = `${goalCount} goal${goalCount === 1 ? '' : 's'}`
  const awaitsApproval = status === 'submitted'

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
                : `${countLabel} · ${statusLabel(status)}`}
            </span>
          </div>
        </div>
        {canApprove || canSendBack ? (
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
          </div>
        ) : (
          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
        )}
      </div>
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
