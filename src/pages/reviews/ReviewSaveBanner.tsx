import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import '@/styles/toast.css'

export type ReviewSaveNotice = {
  variant: 'success' | 'error'
  message: string
  shownAt: number
}

export function successNotice(message: string): ReviewSaveNotice {
  return { variant: 'success', message, shownAt: Date.now() }
}

export function noticeFromLocationState(state: unknown): ReviewSaveNotice | null {
  if (!state || typeof state !== 'object' || !('saveNotice' in state)) {
    return null
  }
  const notice = (state as { saveNotice?: ReviewSaveNotice }).saveNotice
  if (
    !notice ||
    (notice.variant !== 'success' && notice.variant !== 'error') ||
    typeof notice.message !== 'string'
  ) {
    return null
  }
  return notice
}

export function useLocationSaveNotice() {
  const location = useLocation()
  const [notice, setNotice] = useState<ReviewSaveNotice | null>(null)

  useEffect(() => {
    const next = noticeFromLocationState(location.state)
    if (!next) return
    setNotice(next)
  }, [location.state])

  return [notice, setNotice] as const
}

export function reviewChromeHost() {
  return typeof document === 'undefined'
    ? null
    : document.querySelector('.pd-app-content-card')
}

function overlayToastHost() {
  if (typeof document === 'undefined') return null
  return document.querySelector(
    '.pd-settings-panel, .pd-goals-drawer, .pd-reviews-drawer',
  )
    ? document.body
    : null
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
  const overlayHost = overlayToastHost()
  const host = overlayHost ?? reviewChromeHost()
  const isError = notice.variant === 'error'
  const banner = (
    <div
      key={notice.shownAt}
      className={[
        'pd-review-packet__banner',
        `pd-review-packet__banner--${notice.variant}`,
        overlayHost ? 'pd-review-packet__banner--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
