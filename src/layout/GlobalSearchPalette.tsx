import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { cx } from '@/lib/cx'
import {
  presentSearchResults,
  readRecentSearchIds,
  rememberSearchVisit,
  SEARCH_SCOPES,
  type HighlightRange,
  type RankedSearchItem,
  type SearchItem,
  type SearchScope,
} from '@/lib/search'

export type GlobalSearchHandle = {
  show: () => void
  hide: () => void
  isVisible: () => boolean
}

type GlobalSearchPaletteProps = {
  open: boolean
  onClose: () => void
  items: SearchItem[]
}

function HighlightedText({
  text,
  ranges,
}: {
  text: string
  ranges: HighlightRange[]
}) {
  if (ranges.length === 0) return text

  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach((range, index) => {
    const start = Math.max(0, Math.min(range.start, text.length))
    const end = Math.max(start, Math.min(range.end, text.length))
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={`${start}-${end}-${index}`} className="pd-global-search__mark">
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function SearchKbd({ children }: { children: ReactNode }) {
  return <kbd className="pd-global-search__kbd">{children}</kbd>
}

export const GlobalSearchPalette = forwardRef<
  GlobalSearchHandle,
  GlobalSearchPaletteProps
>(function GlobalSearchPalette({ open, onClose, items }, ref) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(open)
  openRef.current = open
  const listId = useId()

  const [query, setQuery] = useState('')
  const [chipScope, setChipScope] = useState<SearchScope>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentIds, setRecentIds] = useState(readRecentSearchIds)

  const presented = useMemo(
    () => presentSearchResults(items, query, chipScope, recentIds),
    [chipScope, items, query, recentIds],
  )
  const results = presented.flat

  const restoreFocus = () => {
    const previous = previousFocusRef.current
    previousFocusRef.current = null
    previous?.focus()
  }

  const resetIdleState = () => {
    setQuery('')
    setChipScope('all')
    setActiveIndex(0)
    setRecentIds(readRecentSearchIds())
  }

  const show = () => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      dialog.showModal()
    }
    inputRef.current?.focus()
  }

  const hide = () => {
    const dialog = dialogRef.current
    if (dialog?.open) dialog.close()
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
    isVisible: () => Boolean(dialogRef.current?.open),
  }))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.setAttribute('closedby', 'any')
  }, [])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) show()
    if (!open && dialog.open) hide()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const syncClosed = () => {
      resetIdleState()
      restoreFocus()
      if (openRef.current) onClose()
    }
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return
      const rect = dialog.getBoundingClientRect()
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      if (!inside) dialog.close()
    }

    dialog.addEventListener('close', syncClosed)
    dialog.addEventListener('click', handleBackdropClick)
    return () => {
      dialog.removeEventListener('close', syncClosed)
      dialog.removeEventListener('click', handleBackdropClick)
    }
  }, [onClose])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, chipScope])

  useEffect(() => {
    if (!open || activeIndex === 0) return
    itemRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, open])

  const dismiss = () => {
    const dialog = dialogRef.current
    if (dialog?.open) {
      dialog.close()
      return
    }
    onClose()
  }

  const goToItem = (item: RankedSearchItem | SearchItem) => {
    rememberSearchVisit(item)
    setRecentIds(readRecentSearchIds())
    navigate(item.path)
    dismiss()
  }

  const cycleScope = (direction: 1 | -1) => {
    const index = SEARCH_SCOPES.findIndex((scope) => scope.id === chipScope)
    const next = SEARCH_SCOPES[(index + direction + SEARCH_SCOPES.length) % SEARCH_SCOPES.length]
    setChipScope(next.id)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      cycleScope(event.shiftKey ? -1 : 1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (results.length === 0) return
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (results.length === 0) return
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      if (results.length === 0) return
      setActiveIndex(results.length - 1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const item = results[activeIndex]
      if (item) goToItem(item)
    }
  }

  let walkingIndex = 0

  return (
    <dialog
      ref={dialogRef}
      className="pd-global-search"
      aria-label="Search the company"
    >
      <form
        className="pd-global-search__header"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="pd-global-search__field">
          <span className="pd-global-search__field-icon" aria-hidden>
            <Search size={18} strokeWidth={1.75} />
          </span>
          <input
            ref={inputRef}
            type="search"
            className="pd-global-search__input"
            placeholder="Search people, goals, reviews, pages…"
            aria-label="Search people, goals, reviews, and pages"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={
              open && results[activeIndex]
                ? `${listId}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            role="combobox"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              className="pd-global-search__clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : (
            <SearchKbd>/</SearchKbd>
          )}
        </label>
        <nav className="pd-global-search__filters" aria-label="Filter results">
          {SEARCH_SCOPES.map((scope) => (
            <button
              key={scope.id}
              type="button"
              className={cx(
                'pd-global-search__filter',
                chipScope === scope.id && 'is-active',
              )}
              aria-pressed={chipScope === scope.id}
              tabIndex={-1}
              onClick={() => setChipScope(scope.id)}
            >
              {scope.label}
            </button>
          ))}
        </nav>
      </form>

      <section
        className="pd-global-search__results"
        role="listbox"
        id={listId}
        aria-label="Search results"
      >
        {results.length === 0 ? (
          <p className="pd-global-search__empty">
            {query.trim()
              ? `No results for “${query.trim()}”. Try @people, g: goals, or > actions.`
              : 'Type to search, or filter with the chips above.'}
          </p>
        ) : (
          presented.groups.map((group) => (
            <section key={group.id} className="pd-global-search__group">
              <h3 className="pd-global-search__group-label">{group.label}</h3>
              <ul className="pd-global-search__list">
                {group.items.map((item) => {
                  const index = walkingIndex
                  walkingIndex += 1
                  const Icon = item.icon
                  const isActive = index === activeIndex
                  return (
                    <li key={item.id}>
                      <Link
                        id={`${listId}-option-${index}`}
                        ref={(element) => {
                          itemRefs.current[index] = element
                        }}
                        to={item.path}
                        role="option"
                        aria-selected={isActive}
                        tabIndex={-1}
                        className={cx(
                          'pd-global-search__item',
                          isActive && 'is-active',
                        )}
                        onClick={() => {
                          rememberSearchVisit(item)
                          setRecentIds(readRecentSearchIds())
                          dismiss()
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        {item.avatarName ? (
                          <Avatar
                            name={item.avatarName}
                            src={item.avatarUrl}
                            size="sm"
                            className="pd-global-search__avatar"
                          />
                        ) : (
                          <span className="pd-global-search__item-icon" aria-hidden>
                            {Icon ? <Icon size={15} strokeWidth={1.85} /> : null}
                          </span>
                        )}
                        <span className="pd-global-search__item-text">
                          <span className="pd-global-search__item-label">
                            <HighlightedText
                              text={item.label}
                              ranges={item.highlights}
                            />
                          </span>
                          {item.description ? (
                            <span className="pd-global-search__item-description">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                        {item.status ? (
                          <span
                            className={cx(
                              'pd-global-search__status',
                              item.statusVariant &&
                                `pd-global-search__status--${item.statusVariant}`,
                            )}
                          >
                            {item.status}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </section>

      <footer className="pd-global-search__footer">
        <p className="pd-global-search__hints">
          <span>
            <SearchKbd>↑</SearchKbd>
            <SearchKbd>↓</SearchKbd>
            navigate
          </span>
          <span>
            <SearchKbd>↵</SearchKbd>
            open
          </span>
          <span>
            <SearchKbd>tab</SearchKbd>
            filter
          </span>
          <span>
            <SearchKbd>esc</SearchKbd>
            close
          </span>
        </p>
        <p className="pd-global-search__count">
          {results.length === 0
            ? 'No results'
            : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
        </p>
      </footer>
    </dialog>
  )
})
