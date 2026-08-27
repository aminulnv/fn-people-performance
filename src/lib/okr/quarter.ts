/** Normalize a goals-cycle label or period key into the OKR platform quarter. */
export function okrQuarterFromLabel(
  value?: string | null,
): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const iso = trimmed.match(/^(\d{4})-Q([1-4])$/i)
  if (iso) return `${iso[1]}-Q${iso[2]}`

  const named = trimmed.match(/^Q([1-4])\s+(\d{4})$/i)
  if (named) return `${named[2]}-Q${named[1]}`

  const keyed = trimmed.match(/^q([1-4])-(\d{4})$/i)
  if (keyed) return `${keyed[2]}-Q${keyed[1]}`

  return undefined
}
