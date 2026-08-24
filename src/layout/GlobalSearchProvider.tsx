import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isTypingTarget } from '@/lib/search'
import { useSearchCatalog } from '@/lib/search/useSearchCatalog'
import {
  GlobalSearchPalette,
  type GlobalSearchHandle,
} from './GlobalSearchPalette'

type GlobalSearchContextValue = {
  openSearch: () => void
  closeSearch: () => void
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

export function useGlobalSearch(): GlobalSearchContextValue {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider')
  }
  return context
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const paletteRef = useRef<GlobalSearchHandle>(null)
  const items = useSearchCatalog()

  const openSearch = useCallback(() => {
    paletteRef.current?.show()
    setOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    paletteRef.current?.hide()
    setOpen(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return

      const isCommandK =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 'k'

      if (isCommandK) {
        event.preventDefault()
        if (paletteRef.current?.isVisible()) {
          paletteRef.current.hide()
          setOpen(false)
          return
        }
        paletteRef.current?.show()
        setOpen(true)
        return
      }

      if (event.key !== '/') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (paletteRef.current?.isVisible()) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      paletteRef.current?.show()
      setOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(
    () => ({ openSearch, closeSearch }),
    [closeSearch, openSearch],
  )

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <GlobalSearchPalette
        ref={paletteRef}
        open={open}
        onClose={closeSearch}
        items={items}
      />
    </GlobalSearchContext.Provider>
  )
}
