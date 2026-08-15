import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cx } from '@/lib/cx'

export type ListboxOption = {
  value: string
  label: string
  description?: string
  leading?: ReactNode
  searchText?: string
  disabled?: boolean
  className?: string
}

export type ListboxSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: ListboxOption[]
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  className?: string
  /** Include an empty “clear” choice at the top. Default true. */
  allowEmpty?: boolean
  emptyLabel?: string
  searchable?: boolean
  searchPlaceholder?: string
  noResultsText?: string
  'aria-label'?: string
}

export function ListboxSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  name,
  id,
  className,
  allowEmpty = true,
  emptyLabel,
  searchable = false,
  searchPlaceholder = 'Search…',
  noResultsText = 'No options found',
  'aria-label': ariaLabel,
}: ListboxSelectProps) {
  const autoId = useId()
  const listboxId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const items = useMemo(() => {
    const next = [...options]
    if (allowEmpty) {
      next.unshift({
        value: '',
        label: emptyLabel ?? placeholder,
      })
    }
    return next
  }, [options, allowEmpty, emptyLabel, placeholder])

  const selected = options.find((option) => option.value === value)
  const displayLabel = selected?.label ?? ''
  const showPlaceholder = !selected
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return items

    return items.filter((item) =>
      [item.label, item.description, item.searchText]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    )
  }, [items, query])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setQuery('')
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const selectedIndex = filteredItems.findIndex((item) => item.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [open, filteredItems, value])

  useEffect(() => {
    if (!open) return
    if (searchable && document.activeElement === searchRef.current) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex, searchable])

  useEffect(() => {
    if (!open || !searchable) return
    searchRef.current?.focus()
  }, [open, searchable])

  const enabledIndexes = filteredItems
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0)

  const moveActive = (delta: number) => {
    if (!enabledIndexes.length) return
    const currentPos = enabledIndexes.indexOf(activeIndex)
    const start = currentPos >= 0 ? currentPos : 0
    const nextPos =
      (start + delta + enabledIndexes.length) % enabledIndexes.length
    setActiveIndex(enabledIndexes[nextPos]!)
  }

  const choose = (nextValue: string) => {
    onValueChange(nextValue)
    setQuery('')
    setOpen(false)
  }

  const close = () => {
    setQuery('')
    setOpen(false)
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      setOpen(true)
    }
  }

  const onOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemValue: string,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      if (enabledIndexes[0] != null) setActiveIndex(enabledIndexes[0])
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = enabledIndexes[enabledIndexes.length - 1]
      if (last != null) setActiveIndex(last)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(itemValue)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && enabledIndexes[0] != null) {
      event.preventDefault()
      setActiveIndex(enabledIndexes[0])
      optionRefs.current[enabledIndexes[0]]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  return (
    <div
      ref={containerRef}
      className={cx('pd-listbox', open && 'is-open', className)}
    >
      {name ? (
        <input type="hidden" name={name} value={value} readOnly />
      ) : null}
      <button
        type="button"
        id={listboxId}
        className={cx(
          'pd-listbox__trigger',
          showPlaceholder && 'pd-listbox__trigger--placeholder',
        )}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listboxId}-list`}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return
          if (open) setQuery('')
          setOpen((previousOpen) => !previousOpen)
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="pd-listbox__value">
          {!showPlaceholder && selected?.leading ? selected.leading : null}
          <span className="pd-listbox__value-text">
            {showPlaceholder ? placeholder : displayLabel}
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={cx('pd-listbox__chevron', open && 'is-open')}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="pd-listbox__panel"
        >
          {searchable ? (
            <label className="pd-listbox__search">
              <Search size={14} strokeWidth={1.8} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
              />
            </label>
          ) : null}
          <div
            id={`${listboxId}-list`}
            role="listbox"
            aria-label={ariaLabel ?? placeholder}
          >
            {filteredItems.map((item, index) => {
              const isSelected = item.value === value
              const isActive = index === activeIndex
              return (
                <button
                  key={`${item.value || '__empty'}-${index}`}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={item.disabled}
                  tabIndex={isActive ? 0 : -1}
                  className={cx(
                    'pd-listbox__option',
                    item.className,
                    isSelected && 'is-selected',
                    isActive && 'is-active',
                    !item.value && 'pd-listbox__option--empty',
                  )}
                  onMouseEnter={() => {
                    if (!item.disabled) setActiveIndex(index)
                  }}
                  onClick={() => choose(item.value)}
                  onKeyDown={(event) => onOptionKeyDown(event, item.value)}
                >
                  <span className="pd-listbox__option-content">
                    {item.leading}
                    <span className="pd-listbox__option-text">
                      <span className="pd-listbox__option-label">{item.label}</span>
                      {item.description ? (
                        <span className="pd-listbox__option-description">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check size={14} strokeWidth={2.25} aria-hidden />
                  ) : null}
                </button>
              )
            })}
            {filteredItems.length === 0 ? (
              <p className="pd-listbox__empty">{noResultsText}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
