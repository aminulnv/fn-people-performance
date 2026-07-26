import type { HTMLAttributes } from 'react'
import { nameInitials } from '@/layout/utils'
import { cx } from '@/lib/cx'

export type AvatarSize = 'sm' | 'md' | 'lg'

export type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  alt?: string
}

export function Avatar({
  name,
  src,
  size = 'md',
  alt,
  className,
  ...props
}: AvatarProps) {
  const initials = nameInitials(name)
  const label = alt ?? name ?? 'Avatar'

  return (
    <span
      className={cx('pd-avatar', `pd-avatar--${size}`, className)}
      role="img"
      aria-label={label}
      {...props}
    >
      {src ? (
        <img className="pd-avatar__image" src={src} alt="" />
      ) : (
        <span className="pd-avatar__initials" aria-hidden>
          {initials}
        </span>
      )}
    </span>
  )
}
