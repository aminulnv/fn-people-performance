import { useCallback, useRef, useState, type MouseEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyAppearance } from '@/lib/brand'

const THEME_TRANSITION_MS = 450

function readIsDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function supportsViewTransitions(): boolean {
  return typeof document.startViewTransition === 'function'
}

/**
 * Circular light↔dark reveal originating at the toggle button.
 * Falls back to an instant swap when View Transitions are unavailable
 * or the user prefers reduced motion.
 */
function runCircularThemeTransition(
  originEl: HTMLElement | null,
  click: MouseEvent<HTMLButtonElement>,
  apply: () => void,
): void {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    apply()
    return
  }

  const rect = originEl?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : click.clientX
  const y = rect ? rect.top + rect.height / 2 : click.clientY
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  const root = document.documentElement
  root.dataset.themeTransition = 'circle'

  const transition = document.startViewTransition(apply)
  void transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: THEME_TRANSITION_MS,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {
      /* transition aborted */
    })

  void transition.finished.finally(() => {
    delete root.dataset.themeTransition
  })
}

export function TopBarDarkMode() {
  const [isDark, setIsDark] = useState(readIsDark)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleToggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const next = isDark ? 'light' : 'dark'
      runCircularThemeTransition(buttonRef.current, event, () => {
        applyAppearance(next)
        setIsDark(!isDark)
      })
    },
    [isDark],
  )

  return (
    <button
      ref={buttonRef}
      type="button"
      className="pd-topbar__icon-btn pd-topbar__dark-btn"
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun size={16} strokeWidth={2} aria-hidden />
      ) : (
        <Moon size={16} strokeWidth={2} aria-hidden />
      )}
    </button>
  )
}
