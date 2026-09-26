import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomeOrientation } from '@/lib/home/homeOrientation'
import { publicUrl } from '@/lib/publicUrl'

type HomeActionsIdleProps = {
  orientation: HomeOrientation | null
}

/** Right-rail placeholder when there are no action banners. */
export function HomeActionsIdle({ orientation }: HomeActionsIdleProps) {
  const artwork = publicUrl('images/3D Icons/Approve.png')

  return (
    <div className="pd-home-actions-idle" aria-label="No actions right now">
      <div className="pd-home-actions-idle__copy">
        <p className="pd-home-actions-idle__eyebrow">All caught up</p>
        <p className="pd-home-actions-idle__title">You’re clear</p>
        <p className="pd-home-actions-idle__body">
          {orientation?.clearCopy ?? 'Nothing needs you on Home right now.'}
        </p>
        {orientation ? (
          <div className="pd-home-actions-idle__links">
            <Link to={orientation.goalsHref} className="pd-home-actions-idle__link">
              My Goals
              <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
            </Link>
            <Link
              to={orientation.reviewsHref}
              className="pd-home-actions-idle__link"
            >
              My Reviews
              <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>
      <div className="pd-home-actions-idle__art" aria-hidden>
        <img src={artwork} alt="" draggable={false} />
      </div>
    </div>
  )
}
