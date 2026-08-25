import { useEffect, useState } from 'react'
import { FocusSafeTextArea } from './FocusSafeTextField'

export function InlinePencilField({
  value,
  onChange,
  placeholder,
  editLabel,
  inputLabel,
  inputKey,
  requestFocus,
  onFocusRequested,
  displayClassName,
  inputClassName,
  error,
  stayInEditWhenEmpty,
  onEmptyBlur,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  editLabel: string
  inputLabel?: string
  inputKey?: string
  requestFocus?: boolean
  onFocusRequested?: () => void
  displayClassName: string
  inputClassName: string
  error?: string
  stayInEditWhenEmpty?: boolean
  onEmptyBlur?: () => void
  disabled?: boolean
}) {
  const trimmed = value.trim()
  const isEmpty = trimmed === ''
  const [editing, setEditing] = useState(
    () => Boolean(requestFocus) || (Boolean(stayInEditWhenEmpty) && isEmpty),
  )
  const errorClass = error ? ' is-error' : ''

  useEffect(() => {
    if (requestFocus || (stayInEditWhenEmpty && isEmpty)) setEditing(true)
  }, [requestFocus, inputKey, stayInEditWhenEmpty, isEmpty])

  const abandonIfEmpty = (next: string) => {
    if (!next && onEmptyBlur) {
      onEmptyBlur()
      return true
    }
    return false
  }

  const field = editing ? (
    <FocusSafeTextArea
      inputKey={inputKey}
      className={`${displayClassName} ${inputClassName}${errorClass}`.trim()}
      value={value}
      placeholder={placeholder}
      ariaLabel={inputLabel ?? placeholder}
      ariaInvalid={Boolean(error)}
      requestFocus={!disabled}
      disabled={disabled}
      onFocusRequested={onFocusRequested}
      onChange={onChange}
      onBlurComplete={(next) => {
        if (abandonIfEmpty(next)) return
        setEditing(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          if (abandonIfEmpty(event.currentTarget.value.trim())) return
          setEditing(false)
        }
      }}
    />
  ) : (
    <button
      type="button"
      className={`pd-inline-editable-field__trigger ${displayClassName}${
        isEmpty ? ' is-placeholder' : ''
      }${errorClass}`}
      aria-label={editLabel}
      aria-invalid={Boolean(error)}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      {isEmpty ? placeholder : trimmed}
    </button>
  )

  return (
    <span className="pd-inline-editable-field">
      {field}
      {error ? (
        <p className="pd-goal-measure-card__title-error" role="alert">
          {error}
        </p>
      ) : null}
    </span>
  )
}
