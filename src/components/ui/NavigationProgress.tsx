import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Outlet, useLocation } from 'react-router-dom'

type NavigationProgressContextValue = {
  complete: () => void
}

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null)

const TRICKLE_MS = 350
const FINISH_MS = 280
const MAX_TRICKLE = 0.92

function NavigationProgressBar({
  active,
  progress,
}: {
  active: boolean
  progress: number
}) {
  return (
    <div
      className={['pd-nav-progress', active ? 'is-active' : ''].join(' ')}
      aria-hidden="true"
    >
      <div
        className="pd-nav-progress__bar"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const trickleTimerRef = useRef<number | null>(null)
  const finishTimerRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (trickleTimerRef.current != null) {
      window.clearInterval(trickleTimerRef.current)
      trickleTimerRef.current = null
    }
    if (finishTimerRef.current != null) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    clearTimers()
    setActive(true)
    setProgress(0.08)

    trickleTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= MAX_TRICKLE) return current
        const remaining = MAX_TRICKLE - current
        return current + Math.max(remaining * 0.08, 0.01)
      })
    }, TRICKLE_MS)
  }, [clearTimers])

  const complete = useCallback(() => {
    clearTimers()
    setProgress(1)
    finishTimerRef.current = window.setTimeout(() => {
      setActive(false)
      setProgress(0)
    }, FINISH_MS)
  }, [clearTimers])

  const pageKey = pageIdentity(location.pathname)

  useEffect(() => {
    start()
  }, [pageKey, start])

  useEffect(() => clearTimers, [clearTimers])

  return (
    <NavigationProgressContext.Provider value={{ complete }}>
      <NavigationProgressBar active={active} progress={progress} />
      {children}
    </NavigationProgressContext.Provider>
  )
}

export function useNavigationProgress() {
  return useContext(NavigationProgressContext)
}

/** Fires once when this route segment finishes Suspense/lazy loading. */
export function RouteProgressComplete() {
  const context = useNavigationProgress()

  useEffect(() => {
    context?.complete()
  }, [context])

  return null
}

/**
 * Ignores URL bits that only open a right-rail drawer, so the page stays
 * mounted and the panel can start sliding on the same click.
 */
function pageIdentity(pathname: string): string {
  const goalsPerson = pathname.match(/^(\/goals\/[^/]+\/[^/]+)/)
  if (goalsPerson) return goalsPerson[1]
  return pathname
}

/**
 * Suspense boundary content keyed by page, so completion runs after the next
 * lazy page chunk has loaded. Drawer-only URL changes keep the page mounted.
 */
export function SuspenseRouteContent() {
  const { pathname } = useLocation()

  return (
    <Fragment key={pageIdentity(pathname)}>
      <Outlet />
      <RouteProgressComplete />
    </Fragment>
  )
}

/**
 * Completes the bar for top-level routes outside the authenticated shell
 * (e.g. login). Inside the shell, AppLayout owns completion.
 */
export function GlobalRouteProgressComplete() {
  const { pathname } = useLocation()
  const isAuthenticatedShell =
    pathname !== '/login' && !pathname.startsWith('/login')

  if (isAuthenticatedShell) return null
  return <RouteProgressComplete />
}
