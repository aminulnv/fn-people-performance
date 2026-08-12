import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cx } from '@/lib/cx'

export type ListboxOption = {
  value: string
  label: string
  disabled?: boolean
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
  'aria-label': ariaLabel,
}: ListboxSelectProps) {
  const autoId = useId()
  const listboxId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const selectedIndex = items.findIndex((item) => item.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [open, items, value])

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const enabledIndexes = items
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
      setOpen(false)
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
          if (!disabled) setOpen((prev) => !prev)
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="pd-listbox__value">
          {showPlaceholder ? placeholder : displayLabel}
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
          id={`${listboxId}-list`}
          className="pd-listbox__panel"
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
        >
          {items.map((item, index) => {
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
                <span className="pd-listbox__option-label">{item.label}</span>
                {isSelected ? (
                  <Check size={14} strokeWidth={2.25} aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
