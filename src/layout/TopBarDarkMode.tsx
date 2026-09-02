import { useCallback, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyAppearance } from '@/lib/brand'

function readIsDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function TopBarDarkMode() {
  const [isDark, setIsDark] = useState(readIsDark)

  const handleToggle = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    applyAppearance(next)
    setIsDark(!isDark)
  }, [isDark])

  return (
    <button
      type="button"
      className="pd-topbar__icon-btn"
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
