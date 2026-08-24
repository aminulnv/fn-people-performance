const TYPING_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'password',
  'url',
  'tel',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
])

/** True when `/` should type a character instead of opening search. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type || 'text'
    return TYPING_INPUT_TYPES.has(type)
  }

  return Boolean(
    target.closest('[contenteditable="true"], [role="textbox"]'),
  )
}
