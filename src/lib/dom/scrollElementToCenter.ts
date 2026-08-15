export function scrollElementToCenter(
  container: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  if (!container.contains(target)) return false

  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const left =
    container.scrollLeft +
    targetRect.left -
    containerRect.left -
    (container.clientWidth - targetRect.width) / 2
  const top =
    container.scrollTop +
    targetRect.top -
    containerRect.top -
    (container.clientHeight - targetRect.height) / 2

  container.scrollTo({
    left: Math.max(0, Math.min(left, container.scrollWidth - container.clientWidth)),
    top: Math.max(0, Math.min(top, container.scrollHeight - container.clientHeight)),
    behavior,
  })
  return true
}
