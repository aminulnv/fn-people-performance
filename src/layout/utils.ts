export function nameInitials(name?: string | null) {
  const trimmed = name?.trim()
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : '?'
}
