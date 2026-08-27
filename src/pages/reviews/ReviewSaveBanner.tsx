import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import '@/styles/toast.css'

const SUCCESS_TOAST_MS = 2000

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

function ToastBanner({
  notice,
  overlay,
  onDismiss,
}: {
  notice: ReviewSaveNotice
  overlay: boolean
  onDismiss?: (shownAt: number) => void
}) {
  const isError = notice.variant === 'error'

  useEffect(() => {
    if (notice.variant !== 'success' || !onDismiss) return
    const timer = window.setTimeout(() => onDismiss(notice.shownAt), SUCCESS_TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [notice.shownAt, notice.variant, onDismiss])

  return (
    <div
      className={[
        'pd-review-packet__banner',
        `pd-review-packet__banner--${notice.variant}`,
        overlay ? 'pd-review-packet__banner--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <span className="pd-review-packet__banner-icon" aria-hidden>
        {isError ? <span>!</span> : <Check size={15} strokeWidth={2.5} />}
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
          onClick={() => onDismiss(notice.shownAt)}
        >
          {isError ? 'Try again' : 'Got It'}
        </button>
      ) : null}
    </div>
  )
}

export function ReviewSaveBanner({
  notice,
  onDismiss,
}: {
  notice: ReviewSaveNotice | null
  onDismiss?: () => void
}) {
  const [stack, setStack] = useState<ReviewSaveNotice[]>([])
  const onDismissRef = useRef(onDismiss)
  const hadStackRef = useRef(false)
  onDismissRef.current = onDismiss

  const dismiss = useCallback((shownAt: number) => {
    setStack((prev) => prev.filter((item) => item.shownAt !== shownAt))
  }, [])

  useEffect(() => {
    if (!notice) return
    setStack((prev) =>
      prev.some((item) => item.shownAt === notice.shownAt)
        ? prev
        : [...prev, notice],
    )
  }, [notice])

  useEffect(() => {
    if (stack.length > 0) {
      hadStackRef.current = true
      return
    }
    if (!hadStackRef.current) return
    hadStackRef.current = false
    onDismissRef.current?.()
  }, [stack.length])

  if (stack.length === 0) return null
  const overlayHost = overlayToastHost()
  const host = overlayHost ?? reviewChromeHost()
  const banners = (
    <div
      className={[
        'pd-review-packet__banners',
        overlayHost ? 'pd-review-packet__banners--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {stack.map((item) => (
        <ToastBanner
          key={item.shownAt}
          notice={item}
          overlay={Boolean(overlayHost)}
          onDismiss={onDismiss ? dismiss : undefined}
        />
      ))}
    </div>
  )
  return host ? createPortal(banners, host) : banners
}
