import { useEffect, useRef, useState } from 'react'

/**
 * Text input that keeps local value while focused so autosave / server
 * round-trips cannot snap the field back mid-edit.
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
  const [text, setText] = useState(value)
  const focusedRef = useRef(false)
  const keyRef = useRef(inputKey)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputKey !== undefined && keyRef.current !== inputKey) {
      keyRef.current = inputKey
      focusedRef.current = false
      setText(value)
      return
    }
    if (focusedRef.current) return
    setText(value)
  }, [value, inputKey])

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
      value={text}
      placeholder={placeholder}
      aria-label={label}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        const trimmed = text.trim()
        if (trimmed !== text) setText(trimmed)
        onChange(trimmed)
        onBlurComplete?.()
      }}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onChange(next)
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
  const [text, setText] = useState(value)
  const focusedRef = useRef(false)
  const keyRef = useRef(inputKey)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (inputKey !== undefined && keyRef.current !== inputKey) {
      keyRef.current = inputKey
      focusedRef.current = false
      setText(value)
      return
    }
    if (focusedRef.current) return
    setText(value)
  }, [value, inputKey])

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
      value={text}
      placeholder={placeholder}
      aria-label={label}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        const trimmed = text.trim()
        if (trimmed !== text) setText(trimmed)
        onChange(trimmed)
        onBlurComplete?.()
      }}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onChange(next)
      }}
    />
  )
}
