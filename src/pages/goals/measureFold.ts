import type { MouseEvent } from 'react'

/** Keep title, weight, and delete usable inside a fold summary. */
export function ignoreInteractiveSummaryClick(event: MouseEvent<HTMLElement>) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (
    target.closest(
      'button, input, textarea, select, a, [role="combobox"], [role="listbox"]',
    )
  ) {
    event.preventDefault()
  }
}
