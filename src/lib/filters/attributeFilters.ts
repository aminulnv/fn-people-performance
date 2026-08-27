export type AttributeValue = {
  value: string
  label: string
}

export type AttributeFilterMap = Partial<Record<string, string[]>>

export function toggleAttributeFilter(
  filters: AttributeFilterMap,
  attribute: string,
  value: string,
): AttributeFilterMap {
  const current = filters[attribute] ?? []
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value]
  if (next.length === 0) {
    const { [attribute]: _removed, ...rest } = filters
    return rest
  }
  return { ...filters, [attribute]: next }
}

export function attributeFilterCount(filters: AttributeFilterMap): number {
  return Object.values(filters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0,
  )
}

export function uniqueAttributeValues(
  rawValues: readonly string[],
): AttributeValue[] {
  const seen = new Set<string>()
  let hasEmpty = false
  for (const raw of rawValues) {
    const value = raw.trim()
    if (!value) {
      hasEmpty = true
      continue
    }
    seen.add(value)
  }
  const values = [...seen]
    .sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    )
    .map((value) => ({ value, label: value }))
  if (hasEmpty) values.push({ value: '', label: 'None' })
  return values
}

export function uniqueLabeledAttributeValues(
  entries: readonly AttributeValue[],
): AttributeValue[] {
  const byValue = new Map<string, string>()
  let hasEmpty = false
  for (const entry of entries) {
    const value = entry.value.trim()
    if (!value) {
      hasEmpty = true
      continue
    }
    if (!byValue.has(value)) byValue.set(value, entry.label)
  }
  const values = [...byValue.entries()]
    .sort((left, right) =>
      left[1].localeCompare(right[1], undefined, { sensitivity: 'base' }),
    )
    .map(([value, label]) => ({ value, label }))
  if (hasEmpty) values.push({ value: '', label: 'None' })
  return values
}

export function matchesAttributeFilters(
  filters: AttributeFilterMap,
  values: Readonly<Record<string, string | readonly string[]>>,
): boolean {
  for (const [id, selected] of Object.entries(filters)) {
    if (!selected?.length) continue
    const raw = values[id]
    const candidates = Array.isArray(raw) ? raw : [raw ?? '']
    if (!candidates.some((value) => selected.includes(value))) return false
  }
  return true
}
