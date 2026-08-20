import { useEffect, useRef, useState } from 'react'

/** Local input text that ignores parent updates while the field is focused. */
export function useFocusSafeDraft(value: string, inputKey?: string) {
  const [text, setText] = useState(value)
  const focusedRef = useRef(false)
  const keyRef = useRef(inputKey)

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

  return {
    text,
    setText,
    markFocused() {
      focusedRef.current = true
    },
    markBlurred() {
      focusedRef.current = false
    },
  }
}
