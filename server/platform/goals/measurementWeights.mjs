/**
 * Spread milestone measure weight evenly across checklist items in each group.
 * Metrics are unchanged. The group total (sum of item weights) is preserved.
 */

function resolveMeasureGroupId(measurement, goalMeasurements) {
  if (measurement.kind !== 'milestone') return null
  if (measurement.measureGroupId) return measurement.measureGroupId
  const title = measurement.measureTitle?.trim()
  if (title) {
    for (const other of goalMeasurements) {
      if (other.kind !== 'milestone') continue
      if (other.measureTitle?.trim() === title && other.measureGroupId) {
        return other.measureGroupId
      }
    }
  }
  return measurement.listId ?? measurement.id
}

export function redistributeMilestoneListWeights(items, nextTotal) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(nextTotal) || 0)))
  if (items.length === 0) return items
  if (items.length === 1) {
    return [{ ...items[0], weight: clamped }]
  }

  const currentTotal = items.reduce(
    (sum, item) => sum + (Number(item.weight) || 0),
    0,
  )
  if (currentTotal <= 0) {
    return redistributeMilestoneListWeightsEvenly(items, clamped)
  }

  let assigned = 0
  return items.map((item, index) => {
    if (index === items.length - 1) {
      return { ...item, weight: Math.max(0, clamped - assigned) }
    }
    const share = Math.round(((Number(item.weight) || 0) / currentTotal) * clamped)
    assigned += share
    return { ...item, weight: share }
  })
}

/** Split a checklist total evenly — used when persisting milestone measures. */
export function redistributeMilestoneListWeightsEvenly(items, nextTotal) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(nextTotal) || 0)))
  if (items.length === 0) return items
  if (items.length === 1) {
    return [{ ...items[0], weight: clamped }]
  }
  const each = Math.floor(clamped / items.length)
  const remainder = clamped - each * items.length
  return items.map((item, index) => ({
    ...item,
    weight: each + (index === items.length - 1 ? remainder : 0),
  }))
}

export function normalizeMilestoneWeightsInGoal(measurements) {
  if (!Array.isArray(measurements) || measurements.length === 0) {
    return measurements ?? []
  }

  const resolved = measurements.map((measurement) => {
    if (measurement.kind !== 'milestone') return measurement
    return {
      ...measurement,
      measureGroupId:
        resolveMeasureGroupId(measurement, measurements) ??
        measurement.listId ??
        measurement.id,
    }
  })

  const groups = new Map()
  for (const measurement of resolved) {
    if (measurement.kind !== 'milestone') continue
    const groupId =
      measurement.measureGroupId ?? measurement.listId ?? measurement.id
    const items = groups.get(groupId) ?? []
    items.push(measurement)
    groups.set(groupId, items)
  }

  const weightById = new Map()
  for (const items of groups.values()) {
    if (items.length <= 1) continue
    const groupTotal = items.reduce(
      (sum, item) => sum + (Number(item.weight) || 0),
      0,
    )
    if (groupTotal <= 0) continue
    for (const item of redistributeMilestoneListWeightsEvenly(items, groupTotal)) {
      weightById.set(item.id, item.weight)
    }
  }

  if (weightById.size === 0) return resolved

  return resolved.map((measurement) => {
    if (measurement.kind !== 'milestone') return measurement
    const weight = weightById.get(measurement.id)
    return weight === undefined ? measurement : { ...measurement, weight }
  })
}
