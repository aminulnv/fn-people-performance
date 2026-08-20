import { useEffect, useRef } from 'react'
import { useFocusSafeDraft } from './useFocusSafeDraft'

/**
 * Text input that keeps local value while focused so parent
 * updates and server round-trips cannot snap the field back
 * or re-render the page on every keystroke. Commits on blur.
 */
export function FocusSafeTextField({
  value,
  onChange,
  inputKey,
  className,
  placeholder,
  ariaLabel,
  requestFocus,
  onFocusRequested,
  onBlurComplete,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  /** When this changes, the field resets to `value`. */
  inputKey?: string
  className?: string
  placeholder?: string
  ariaLabel?: string
  /** When true, focus this field once (e.g. after adding a new row). */
  requestFocus?: boolean
  /** Called after `requestFocus` focuses the input. */
  onFocusRequested?: () => void
  onBlurComplete?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const label = ariaLabel ?? placeholder ?? 'Text'
  const draft = useFocusSafeDraft(value, inputKey)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!requestFocus) return
    inputRef.current?.focus()
    onFocusRequested?.()
  }, [requestFocus, inputKey, onFocusRequested])

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={draft.text}
      placeholder={placeholder}
      aria-label={label}
      onFocus={() => {
        draft.markFocused()
      }}
      onBlur={() => {
        const trimmed = draft.text.trim()
        if (trimmed !== draft.text) draft.setText(trimmed)
        draft.markBlurred()
        onChange(trimmed)
        onBlurComplete?.()
      }}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        draft.setText(event.target.value)
      }}
    />
  )
}

/**
 * Multiline variant — wraps like static text for inline heading edits.
 */
export function FocusSafeTextArea({
  value,
  onChange,
  inputKey,
  className,
  placeholder,
  ariaLabel,
  requestFocus,
  onFocusRequested,
  onBlurComplete,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  inputKey?: string
  className?: string
  placeholder?: string
  ariaLabel?: string
  requestFocus?: boolean
  onFocusRequested?: () => void
  onBlurComplete?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  const label = ariaLabel ?? placeholder ?? 'Text'
  const draft = useFocusSafeDraft(value, inputKey)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!requestFocus) return
    inputRef.current?.focus()
    onFocusRequested?.()
  }, [requestFocus, inputKey, onFocusRequested])

  return (
    <textarea
      ref={inputRef}
      rows={1}
      className={className}
      value={draft.text}
      placeholder={placeholder}
      aria-label={label}
      onFocus={() => {
        draft.markFocused()
      }}
      onBlur={() => {
        const trimmed = draft.text.trim()
        if (trimmed !== draft.text) draft.setText(trimmed)
        draft.markBlurred()
        onChange(trimmed)
        onBlurComplete?.()
      }}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        draft.setText(event.target.value)
      }}
    />
  )
}

function parseOptionalNumber(raw: string): number | '' {
  if (raw.trim() === '') return ''
  const next = Number(raw)
  return Number.isFinite(next) ? next : ''
}

/** Numeric input that types locally and commits the parsed value on blur. */
export function FocusSafeNumberField({
  value,
  onCommit,
  inputKey,
  className,
  ariaLabel,
  disabled,
}: {
  value: number | ''
  onCommit: (next: number | '') => void
  inputKey?: string
  className?: string
  ariaLabel: string
  disabled?: boolean
}) {
  const stored = value === '' ? '' : String(value)
  const draft = useFocusSafeDraft(stored, inputKey)

  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      value={draft.text}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={() => {
        draft.markFocused()
      }}
      onChange={(event) => {
        draft.setText(event.target.value)
      }}
      onBlur={() => {
        const next = parseOptionalNumber(draft.text)
        draft.markBlurred()
        draft.setText(next === '' ? '' : String(next))
        if (next !== value) onCommit(next)
      }}
    />
  )
}
