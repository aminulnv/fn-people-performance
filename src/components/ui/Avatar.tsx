import { memo, useState, type HTMLAttributes } from 'react'
import { nameInitials } from '@/layout/utils'
import { cx } from '@/lib/cx'

export type AvatarSize = 'sm' | 'md' | 'lg'

export type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  alt?: string
}

export const Avatar = memo(function Avatar({
  name,
  src,
  size = 'md',
  alt,
  className,
  ...props
}: AvatarProps) {
  const initials = nameInitials(name)
  const label = alt ?? name ?? 'Avatar'
  const trimmed = src?.trim() || ''
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(trimmed) && failedSrc !== trimmed

  return (
    <span
      className={cx('pd-avatar', `pd-avatar--${size}`, className)}
      role="img"
      aria-label={label}
      {...props}
    >
      {showImage ? (
        <img
          className="pd-avatar__image"
          src={trimmed}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(trimmed)}
        />
      ) : (
        <span className="pd-avatar__initials" aria-hidden>
          {initials}
        </span>
      )}
    </span>
  )
})
