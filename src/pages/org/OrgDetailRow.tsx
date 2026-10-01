import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Profile-style labeled detail row for organisation unit pages. */
export function OrgDetailRow({
  label,
  icon: Icon,
  children,
  align = 'center',
}: {
  label: string
  icon: LucideIcon
  children: ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div
      className={[
        'pd-profile__detail-row',
        align === 'start' ? 'pd-org-detail-row--start' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <dt className="pd-profile__detail-label">
        <Icon
          className="pd-profile__detail-icon"
          size={14}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="pd-profile__detail-label-text">{label}</span>
      </dt>
      <dd className="pd-profile__detail-value">{children}</dd>
    </div>
  )
}
