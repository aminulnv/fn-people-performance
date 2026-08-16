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
    <aside className="pd-goals-sendback" role="status">
      <span className="pd-goals-sendback__icon" aria-hidden>
        <Undo2 size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-sendback__copy">
        <div className="pd-goals-sendback__head">
          <p className="pd-goals-sendback__title">Sent back for changes</p>
          {author ? (
            <div className="pd-goals-sendback__author">
              <Avatar
                name={author.name}
                src={author.avatarUrl}
                size="sm"
                className="pd-people__avatar"
                style={avatarStyle(author.name)}
              />
              <span className="pd-goals-sendback__author-name">{author.name}</span>
            </div>
          ) : null}
        </div>
        <p className="pd-goals-sendback__reason">{reason}</p>
      </div>
    </aside>
  )
}
