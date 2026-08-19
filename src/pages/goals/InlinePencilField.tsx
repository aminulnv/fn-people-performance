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
}) {
  const [editing, setEditing] = useState(false)
  const trimmed = value.trim()
  const isEmpty = trimmed === ''

  useEffect(() => {
    if (requestFocus) setEditing(true)
  }, [requestFocus, inputKey])

  if (editing) {
    return (
      <FocusSafeTextArea
        inputKey={inputKey}
        className={`${displayClassName} ${inputClassName}`.trim()}
        value={value}
        placeholder={placeholder}
        ariaLabel={inputLabel ?? placeholder}
        requestFocus
        onFocusRequested={onFocusRequested}
        onChange={onChange}
        onBlurComplete={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={`pd-inline-editable-field__trigger ${displayClassName}${
        isEmpty ? ' is-placeholder' : ''
      }`}
      aria-label={editLabel}
      onClick={() => setEditing(true)}
    >
      {isEmpty ? placeholder : trimmed}
    </button>
  )
}
