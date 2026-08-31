import type { MouseEvent } from 'react'

function isInteractiveSummaryTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, input, textarea, select, a, [role="combobox"], [role="listbox"]',
      ),
    )
  )
}

/** Keep title, weight, and delete usable inside a fold summary. */
export function ignoreInteractiveSummaryClick(event: MouseEvent<HTMLElement>) {
  if (isInteractiveSummaryTarget(event.target)) {
    event.preventDefault()
  }
}

/** Open the focused metric window without toggling the fold. */
export function focusMeasureFromSummary(
  event: MouseEvent<HTMLElement>,
  onFocusMeasure?: () => void,
) {
  if (!onFocusMeasure || isInteractiveSummaryTarget(event.target)) return
  event.preventDefault()
  onFocusMeasure()
}
