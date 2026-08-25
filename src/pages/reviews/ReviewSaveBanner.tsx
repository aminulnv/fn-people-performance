import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import '@/styles/toast.css'

export type ReviewSaveNotice = {
  variant: 'success' | 'error'
  message: string
  shownAt: number
}

export function reviewChromeHost() {
  return typeof document === 'undefined'
    ? null
    : document.querySelector('.pd-app-content-card')
}

export function ReviewActionIsland({ children }: { children: ReactNode }) {
  const host = reviewChromeHost()
  const island = (
    <div
      className="pd-review-packet__footer"
      role="toolbar"
      aria-label="Review actions"
    >
      {children}
    </div>
  )
  return host ? createPortal(island, host) : island
}

export function ReviewSaveBanner({
  notice,
  onDismiss,
}: {
  notice: ReviewSaveNotice | null
  onDismiss?: () => void
}) {
  useEffect(() => {
    if (!notice || notice.variant !== 'success' || !onDismiss) return
    const timer = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timer)
  }, [notice, onDismiss])

  if (!notice) return null
  const host = reviewChromeHost()
  const isError = notice.variant === 'error'
  const banner = (
    <div
      key={notice.shownAt}
      className={[
        'pd-review-packet__banner',
        `pd-review-packet__banner--${notice.variant}`,
      ].join(' ')}
      role="status"
    >
      <span className="pd-review-packet__banner-icon" aria-hidden>
        {isError ? <span>!</span> : <Check size={16} strokeWidth={2.5} />}
      </span>
      <div className="pd-review-packet__banner-copy">
        <p className="pd-review-packet__banner-title">
          {isError ? 'Error' : 'Success!'}
        </p>
        <p className="pd-review-packet__banner-body">{notice.message}</p>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="pd-review-packet__banner-action"
          onClick={onDismiss}
        >
          {isError ? 'Try again' : 'Got It'}
        </button>
      ) : null}
    </div>
  )
  return host ? createPortal(banner, host) : banner
}
