import { useId, type InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cx } from '@/lib/cx'

export type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: string
  onClear?: () => void
}

export function SearchField({
  label = 'Search',
  id,
  className,
  value,
  onClear,
  disabled,
  ...props
}: SearchFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hasValue = typeof value === 'string' && value.length > 0

  return (
    <div className={cx('pd-search', disabled && 'is-disabled', className)}>
      <label className="pd-search__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="pd-search__control">
        <Search
          className="pd-search__icon"
          size={16}
          strokeWidth={2}
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          className="pd-search__input"
          value={value}
          disabled={disabled}
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            className="pd-search__clear"
            onClick={onClear}
            aria-label="Clear search"
            disabled={disabled}
          >
            <X size={14} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  )
}
