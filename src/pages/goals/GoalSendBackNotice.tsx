import { Undo2 } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { SendBackAuthor } from '@/lib/goals/types'

export function GoalSendBackNotice({
  reason,
  author,
}: {
  reason: string
  author?: SendBackAuthor
}) {
  return (
    <aside
      className="pd-goals-sendback pd-goals-sendback--compact pd-goals-sendback--sentence"
      role="status"
    >
      <span className="pd-goals-sendback__icon" aria-hidden>
        <Undo2 size={13} strokeWidth={2.25} />
      </span>
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
    </aside>
  )
}
