const TABLE_WRAP_SELECTOR = '.pd-people__table-wrap'
const SCROLLBAR_REVEAL_MS = 900

/** Keep native scrollbars hidden until hover, focus, or active scrolling. */
export function installTableScrollbarReveal(
  root: Document | HTMLElement = document,
): () => void {
  const hideTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

  function onScroll(event: Event) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!target.matches(TABLE_WRAP_SELECTOR)) return

    target.classList.add('is-scrolling')

    const existing = hideTimers.get(target)
    if (existing) clearTimeout(existing)

    hideTimers.set(
      target,
      setTimeout(() => {
        target.classList.remove('is-scrolling')
        hideTimers.delete(target)
      }, SCROLLBAR_REVEAL_MS),
    )
  }

  root.addEventListener('scroll', onScroll, { capture: true, passive: true })
  return () => {
    root.removeEventListener('scroll', onScroll, { capture: true })
  }
}
