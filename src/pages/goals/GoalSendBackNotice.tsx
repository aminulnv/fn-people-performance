import { Undo2 } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { SendBackAuthor } from '@/lib/goals/types'

function SendBackCopy({
  reason,
  author,
}: {
  reason: string
  author?: SendBackAuthor
}) {
  return (
    <p className="pd-goals-sendback__copy">
      <span className="pd-goals-sendback__title">Sent back for changes</span>
      {author ? (
        <>
          {' '}
          by{' '}
          <span className="pd-goals-sendback__author">
            <Avatar
              name={author.name}
              src={author.avatarUrl}
              size="sm"
              className="pd-people__avatar"
              style={avatarStyle(author.name)}
            />
            <span className="pd-goals-sendback__author-name">{author.name}</span>
          </span>
        </>
      ) : null}
      {': '}
      <span className="pd-goals-sendback__reason">{reason}</span>
    </p>
  )
}

export function GoalSendBackNotice({
  reason,
  author,
  layout = 'card',
}: {
  reason: string
  author?: SendBackAuthor
  /** `ribbon` sits behind the goals table, matching Action required. */
  layout?: 'card' | 'ribbon'
}) {
  const copy = <SendBackCopy reason={reason} author={author} />

  if (layout === 'ribbon') {
    return (
      <aside
        className="pd-goals-sendback pd-goals-sendback--sentence pd-goals-sendback--ribbon pd-goals-banner pd-goals-banner--sendback"
        role="status"
      >
        <div className="pd-goals-banner__start">
          <span className="pd-goals-banner__icon" aria-hidden>
            <Undo2 size={13} strokeWidth={2.25} />
          </span>
          {copy}
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="pd-goals-sendback pd-goals-sendback--compact pd-goals-sendback--sentence"
      role="status"
    >
      <span className="pd-goals-sendback__icon" aria-hidden>
        <Undo2 size={13} strokeWidth={2.25} />
      </span>
      {copy}
    </aside>
  )
}
