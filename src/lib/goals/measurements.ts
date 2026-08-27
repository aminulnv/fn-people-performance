import { proofParts } from './proof'
import type {
  Goal,
  Measurement,
  Metric,
  MetricDirection,
  MetricStrategy,
  MetricUnit,
  Milestone,
} from './types'

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const METRIC_STRATEGIES: {
  id: MetricStrategy
  label: string
}[] = [
    { id: 'increase', label: 'Increase' },
    { id: 'decrease', label: 'Decrease' },
    { id: 'between', label: 'Between' },
    { id: 'keep_above', label: 'Keep above' },
    { id: 'keep_below', label: 'Keep below' },
  ]

export const METRIC_UNITS: { value: MetricUnit; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: '%', label: 'Percent (%)' },
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'currency', label: 'Currency' },
]

/** Map stored / legacy direction values onto Revolut strategies. */
export function normalizeMetricStrategy(
  direction: MetricDirection,
): MetricStrategy {
  switch (direction) {
    case 'greater_than':
    case 'increase':
      return 'increase'
    case 'less_than':
    case 'decrease':
      return 'decrease'
    case 'within_range':
    case 'between':
      return 'between'
    case 'keep_above':
      return 'keep_above'
    case 'keep_below':
      return 'keep_below'
    default:
      return 'increase'
  }
}

export function strategyLabel(direction: MetricDirection): string {
  const strategy = normalizeMetricStrategy(direction)
  return METRIC_STRATEGIES.find((item) => item.id === strategy)?.label ?? strategy
}

function milestoneListId(milestone: Milestone): string {
  return milestone.listId ?? milestone.id
}

export function milestoneMeasureGroupId(milestone: Milestone): string {
  return milestone.measureGroupId ?? milestoneListId(milestone)
}

export function uniqueMilestonesById(todos: Milestone[]): Milestone[] {
  const seen = new Set<string>()
  const unique: Milestone[] = []
  for (const todo of todos) {
    if (seen.has(todo.id)) continue
    seen.add(todo.id)
    unique.push(todo)
  }
  return unique
}

export const DEFAULT_TASK_LIST_TITLE = 'Task List'

const GENERATED_TASK_LIST_TITLE = /^task list(?: (\d+))?$/i

export function numberedTaskListTitle(index: number): string {
  return `${DEFAULT_TASK_LIST_TITLE} ${index}`
}

export function isGeneratedTaskListTitle(title: string | undefined): boolean {
  const trimmed = title?.trim() ?? ''
  if (trimmed === '') return true
  return GENERATED_TASK_LIST_TITLE.test(trimmed)
}

function generatedTaskListNumber(title: string | undefined): number | undefined {
  const trimmed = title?.trim() ?? ''
  if (trimmed === '') return 0
  const match = GENERATED_TASK_LIST_TITLE.exec(trimmed)
  if (!match) return undefined
  return match[1] ? Number(match[1]) : 0
}

function nextNumberedTaskListTitle(titles: string[]): string {
  const used = new Set<number>()
  for (const title of titles) {
    const number = generatedTaskListNumber(title)
    if (number && number >= 1) used.add(number)
  }
  let next = 1
  while (used.has(next)) next += 1
  return numberedTaskListTitle(next)
}

export function blankMilestone(
  weight = 0,
  options?: {
    listId?: string
    listTitle?: string
    measureGroupId?: string
    measureTitle?: string
  },
): Milestone {
  const id = createId('ms')
  const listId = options?.listId ?? id
  const measureGroupId = options?.measureGroupId ?? listId
  return {
    id,
    kind: 'milestone',
    measureGroupId,
    measureTitle: options?.measureTitle,
    listId,
    listTitle: options?.listTitle,
    title: '',
    weight,
    complete: false,
  }
}

/** Legacy milestones without listId share a list with adjacent milestone runs. */
export function normalizeMilestoneListIds(
  measurements: Measurement[],
): Measurement[] {
  let activeRunListId: string | null = null
  const normalized = measurements.map((measurement) => {
    if (measurement.kind === 'metric') {
      activeRunListId = null
      return measurement
    }

    const listId = measurement.listId ?? activeRunListId ?? measurement.id
    if (measurement.listId) {
      activeRunListId = measurement.listId
    } else if (activeRunListId == null) {
      activeRunListId = listId
    }

    const measureGroupId = measurement.measureGroupId ?? listId
    return {
      ...measurement,
      listId,
      measureGroupId,
    }
  })
  return coalesceMeasureGroups(repairMilestoneRunGrouping(normalized))
}

/**
 * Within each contiguous milestone block, keep one measure group (the first list's).
 * Fixes saves that stored each todo list as its own measure_group_id.
 */
export function repairMilestoneRunGrouping(
  measurements: Measurement[],
): Measurement[] {
  const result: Measurement[] = []
  let index = 0

  while (index < measurements.length) {
    const measurement = measurements[index]
    if (measurement.kind === 'metric') {
      result.push(measurement)
      index += 1
      continue
    }

    const run: Milestone[] = []
    while (index < measurements.length && measurements[index].kind === 'milestone') {
      run.push(measurements[index] as Milestone)
      index += 1
    }

    const shouldMergeRun = run.some((item) => {
      const measureTitle = item.measureTitle?.trim()
      const listTitle = item.listTitle?.trim()
      return Boolean(measureTitle && listTitle && measureTitle === listTitle)
    })

    if (!shouldMergeRun) {
      result.push(...run)
      continue
    }

    const first = run[0]
    if (!first) continue

    const canonicalGroupId = milestoneMeasureGroupId(first)
    let canonicalMeasureTitle: string | undefined
    for (const item of run) {
      const measureTitle = item.measureTitle?.trim()
      const listTitle = item.listTitle?.trim()
      if (measureTitle && measureTitle !== listTitle) {
        canonicalMeasureTitle = measureTitle
        break
      }
    }

    for (const item of run) {
      const listTitle = item.listTitle?.trim()
      let measureTitle = item.measureTitle
      if (canonicalMeasureTitle) {
        measureTitle = canonicalMeasureTitle
      } else if (measureTitle?.trim() === listTitle) {
        measureTitle = undefined
      }
      result.push({
        ...item,
        measureGroupId: canonicalGroupId,
        measureTitle,
      })
    }
  }

  return result
}

/**
 * Milestones that share a measure name belong to one metric, even when a save
 * round-trip dropped measureGroupId and each list fell back to its listId.
 */
export function coalesceMeasureGroups(
  measurements: Measurement[],
): Measurement[] {
  const canonicalByTitle = new Map<string, string>()

  for (const item of measurements) {
    if (item.kind !== 'milestone') continue
    const title = item.measureTitle?.trim()
    if (!title) continue
    if (!canonicalByTitle.has(title)) {
      canonicalByTitle.set(title, item.measureGroupId ?? milestoneMeasureGroupId(item))
    }
  }

  if (canonicalByTitle.size === 0) return measurements

  return measurements.map((item) => {
    if (item.kind !== 'milestone') return item
    const title = item.measureTitle?.trim()
    if (!title) return item
    const canonical = canonicalByTitle.get(title)
    if (!canonical || milestoneMeasureGroupId(item) === canonical) return item
    return { ...item, measureGroupId: canonical }
  })
}

/** Ensure every checklist row in a measure carries the same group metadata. */
export function stampMeasureGroup(
  measurements: Measurement[],
  measureGroupId: string,
  measureTitle?: string,
): Measurement[] {
  const nextTitle = measureTitle?.trim() || undefined
  return measurements.map((item) => {
    if (item.kind !== 'milestone') return item
    if (milestoneMeasureGroupId(item) !== measureGroupId) return item
    return {
      ...item,
      measureGroupId,
      measureTitle: nextTitle ?? item.measureTitle,
    }
  })
}

/** Spread a checklist total across its items, keeping the total unchanged. */
export function redistributeMilestoneListWeights(
  items: Milestone[],
  nextTotal: number,
): Milestone[] {
  const clamped = Math.max(0, Math.min(100, Math.round(nextTotal)))
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

export function milestoneListTitle(items: Milestone[]): string {
  return items[0]?.listTitle?.trim() ?? ''
}

export function measureGroupTitle(items: Milestone[]): string {
  return items[0]?.measureTitle?.trim() ?? ''
}

/** Read the stored measure name directly — use this for inputs, not panel.title. */
export function readMeasureGroupTitle(
  measurements: Measurement[],
  measureGroupId: string,
): string {
  for (const item of normalizeMilestoneListIds(measurements)) {
    if (
      item.kind === 'milestone' &&
      milestoneMeasureGroupId(item) === measureGroupId
    ) {
      return item.measureTitle?.trim() ?? ''
    }
  }
  return ''
}

export function withMilestoneListTitle(
  items: Milestone[],
  listTitle: string,
): Milestone[] {
  const nextTitle = listTitle === '' ? undefined : listTitle
  const listId = items[0] ? milestoneListId(items[0]) : undefined
  return items.map((item) => ({
    ...item,
    listId: listId ?? item.listId ?? item.id,
    listTitle: nextTitle,
  }))
}

export function withMeasureTitle(
  measurements: Measurement[],
  measureGroupId: string,
  measureTitle: string,
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const nextTitle = measureTitle.trim() === '' ? undefined : measureTitle.trim()
  const next = normalized.map((item) =>
    item.kind === 'milestone' &&
      milestoneMeasureGroupId(item) === measureGroupId
      ? { ...item, measureTitle: nextTitle }
      : item,
  )
  return stampMeasureGroup(next, measureGroupId, nextTitle)
}

export function readMeasureGroupProof(
  measurements: Measurement[],
  measureGroupId: string,
): { proofUrl?: string; comment?: string } {
  const items = normalizeMilestoneListIds(measurements).filter(
    (item): item is Milestone =>
      item.kind === 'milestone' &&
      milestoneMeasureGroupId(item) === measureGroupId,
  )
  const source =
    items.find((item) => proofParts(item.proofUrl, item.comment).hasProof) ??
    items[0]
  return { proofUrl: source?.proofUrl, comment: source?.comment }
}

export function withMeasureProof(
  measurements: Measurement[],
  measureGroupId: string,
  proof: { proofUrl?: string; comment?: string },
): Measurement[] {
  return normalizeMilestoneListIds(measurements).map((item) => {
    if (
      item.kind !== 'milestone' ||
      milestoneMeasureGroupId(item) !== measureGroupId
    ) {
      return item
    }
    return {
      ...item,
      proofUrl: proof.proofUrl,
      ...('comment' in proof ? { comment: proof.comment } : {}),
    }
  })
}

/** Read a checklist item title from stored measurements — not derived panels. */
export function readMilestoneTitle(
  measurements: Measurement[],
  milestoneId: string,
): string {
  const item = measurements.find(
    (entry): entry is Milestone =>
      entry.kind === 'milestone' && entry.id === milestoneId,
  )
  return item?.title ?? ''
}

/** Read a todo list name from stored measurements — not derived panels. */
export function readMilestoneListTitle(
  measurements: Measurement[],
  listKey: string,
): string {
  const items = normalizeMilestoneListIds(measurements).filter(
    (entry): entry is Milestone =>
      entry.kind === 'milestone' && milestoneListId(entry) === listKey,
  )
  return milestoneListTitle(items)
}

export function withMilestoneTitle(
  measurements: Measurement[],
  milestoneId: string,
  title: string,
): Measurement[] {
  return normalizeMilestoneListIds(measurements).map((item) =>
    item.kind === 'milestone' && item.id === milestoneId
      ? { ...item, title }
      : item,
  )
}

export function patchMilestone(
  measurements: Measurement[],
  milestoneId: string,
  patch: Partial<Milestone>,
): Measurement[] {
  return normalizeMilestoneListIds(measurements).map((item) =>
    item.kind === 'milestone' && item.id === milestoneId
      ? { ...item, ...patch }
      : item,
  )
}

function findMilestoneListKey(
  measurements: Measurement[],
  milestoneId: string,
): string | null {
  const milestone = measurements.find(
    (item): item is Milestone =>
      item.kind === 'milestone' && item.id === milestoneId,
  )
  return milestone ? milestoneListId(milestone) : null
}

export function replaceMilestoneList(
  measurements: Measurement[],
  listKey: string,
  items: Milestone[],
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const normalizedItems = withMilestoneListTitle(
    items.map((item) => ({ ...item, listId: listKey })),
    milestoneListTitle(items),
  )
  const next: Measurement[] = []
  let replaced = false

  for (const measurement of normalized) {
    if (measurement.kind === 'metric') {
      next.push(measurement)
      continue
    }
    if (milestoneListId(measurement) === listKey) {
      if (!replaced) {
        next.push(...normalizedItems)
        replaced = true
      }
      continue
    }
    next.push(measurement)
  }

  return next
}

/** Adds a new top-level milestone measure with one empty todo list. */
export function appendMilestoneList(measurements: Measurement[]): Measurement[] {
  return rebalanceMeasurementWeights([
    ...normalizeMilestoneListIds(measurements),
    blankMilestone(0, { listTitle: DEFAULT_TASK_LIST_TITLE }),
  ])
}

/** Adds another named todo list inside an existing milestone measure. */
export function appendTodoListToMeasure(
  measurements: Measurement[],
  measureGroupId: string,
  listTitle?: string,
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const sample = normalized.find(
    (item): item is Milestone =>
      item.kind === 'milestone' &&
      milestoneMeasureGroupId(item) === measureGroupId,
  )
  if (!sample) return normalized

  const panel = measurementPanels(normalized).find(
    (entry): entry is Extract<MeasurementPanel, { kind: 'todo_measure' }> =>
      entry.kind === 'todo_measure' &&
      entry.measureGroupId === measureGroupId,
  )

  let nextMeasurements = normalized
  if (panel?.lists.length === 1) {
    const only = panel.lists[0]
    if (only && isGeneratedTaskListTitle(only.listTitle)) {
      nextMeasurements = replaceMilestoneList(
        nextMeasurements,
        only.listKey,
        withMilestoneListTitle(only.todos, numberedTaskListTitle(1)),
      )
    }
  }

  const titledPanel = measurementPanels(nextMeasurements).find(
    (entry): entry is Extract<MeasurementPanel, { kind: 'todo_measure' }> =>
      entry.kind === 'todo_measure' &&
      entry.measureGroupId === measureGroupId,
  )
  const nextTitle =
    listTitle?.trim() ||
    nextNumberedTaskListTitle(
      titledPanel?.lists.map((list) => list.listTitle) ?? [],
    )

  const proof = readMeasureGroupProof(nextMeasurements, measureGroupId)
  const newList = {
    ...blankMilestone(0, {
      measureGroupId,
      measureTitle: sample.measureTitle,
      listTitle: nextTitle,
    }),
    ...proof,
  }

  let insertAt = normalized.length
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const item = normalized[index]
    if (
      item.kind === 'milestone' &&
      milestoneMeasureGroupId(item) === measureGroupId
    ) {
      insertAt = index + 1
      break
    }
  }

  const next = [...nextMeasurements]
  next.splice(insertAt, 0, newList)
  return stampMeasureGroup(
    rebalanceMeasurementWeights(next),
    measureGroupId,
    sample.measureTitle,
  )
}

export function appendMilestoneToList(
  measurements: Measurement[],
  listKey: string,
  item: Milestone = blankMilestone(0, { listId: listKey }),
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const panel = measurementPanels(normalized).find(
    (entry): entry is Extract<MeasurementPanel, { kind: 'todo_measure' }> =>
      entry.kind === 'todo_measure' &&
      entry.lists.some((list) => list.listKey === listKey),
  )
  const list = panel?.lists.find((entry) => entry.listKey === listKey)
  if (!panel || !list) return normalized

  const listTitle = milestoneListTitle(list.todos)
  const measureTitle = measureGroupTitle(list.todos)
  const proof = readMeasureGroupProof(normalized, panel.measureGroupId)
  const runTotal = list.todos.reduce((sum, entry) => sum + entry.weight, 0)
  const nextRun = redistributeMilestoneListWeights(
    [
      ...list.todos,
      {
        ...item,
        listId: listKey,
        listTitle: listTitle || undefined,
        measureGroupId: panel.measureGroupId,
        measureTitle: measureTitle || undefined,
        proofUrl: proof.proofUrl,
        comment: proof.comment,
      },
    ],
    runTotal,
  )
  return replaceMilestoneList(normalized, listKey, nextRun)
}

export function removeMilestoneList(
  measurements: Measurement[],
  listKey: string,
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const panels = measurementPanels(normalized)
  const next: Measurement[] = []
  for (const panel of panels) {
    if (panel.kind === 'metric') {
      next.push(panel.metric)
      continue
    }
    const remainingLists = panel.lists.filter((list) => list.listKey !== listKey)
    if (remainingLists.length === 0) continue
    if (remainingLists.length === 1) {
      const only = remainingLists[0]
      if (only && isGeneratedTaskListTitle(only.listTitle)) {
        next.push(
          ...withMilestoneListTitle(only.todos, DEFAULT_TASK_LIST_TITLE),
        )
        continue
      }
    }
    for (const list of remainingLists) {
      next.push(...list.todos)
    }
  }
  return rebalanceMeasurementWeights(next.length === 0 ? [] : next)
}

export function removeTodoMeasure(
  measurements: Measurement[],
  measureGroupId: string,
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const next = normalized.filter(
    (item) =>
      item.kind === 'metric' ||
      milestoneMeasureGroupId(item) !== measureGroupId,
  )
  return rebalanceMeasurementWeights(next.length === 0 ? [] : next)
}

export function removeMilestoneFromList(
  measurements: Measurement[],
  milestoneId: string,
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const listKey = findMilestoneListKey(normalized, milestoneId)
  if (!listKey) return normalized

  const panel = measurementPanels(normalized).find(
    (entry): entry is Extract<MeasurementPanel, { kind: 'todo_measure' }> =>
      entry.kind === 'todo_measure' &&
      entry.lists.some((list) => list.listKey === listKey),
  )
  const list = panel?.lists.find((entry) => entry.listKey === listKey)
  if (!list) return normalized

  if (list.todos.length === 1) {
    return removeMilestoneList(normalized, listKey)
  }

  const runTotal = list.todos.reduce((sum, entry) => sum + entry.weight, 0)
  const nextRun = redistributeMilestoneListWeights(
    list.todos.filter((entry) => entry.id !== milestoneId),
    runTotal,
  )
  return replaceMilestoneList(normalized, listKey, nextRun)
}

export function canEditMeasurementWeights(measurements: Measurement[]): boolean {
  return measurementPanels(measurements).length > 1
}

/** A lone measure always owns the full 100%. */
export function lockSoloMeasurementWeights(
  measurements: Measurement[],
): Measurement[] {
  if (measurementPanels(measurements).length !== 1) return measurements
  if (sumPanelWeights(measurements) === 100) return measurements
  return rebalanceMeasurementWeights(measurements)
}

export function setMeasurementPanelWeight(
  measurements: Measurement[],
  panelKey: string,
  nextWeight: number,
): Measurement[] {
  if (!canEditMeasurementWeights(measurements)) {
    return lockSoloMeasurementWeights(measurements)
  }
  const panel = measurementPanels(measurements).find((entry) => entry.key === panelKey)
  if (!panel) return measurements
  const clamped = Math.max(0, Math.min(100, Math.round(nextWeight)))
  if (panel.kind === 'metric') {
    return measurements.map((item) =>
      item.kind === 'metric' && item.id === panel.metric.id
        ? { ...item, weight: clamped }
        : item,
    )
  }
  return redistributeTodoMeasureWeight(measurements, panel.measureGroupId, clamped)
}

export function redistributeTodoMeasureWeight(
  measurements: Measurement[],
  measureGroupId: string,
  nextWeight: number,
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const panel = measurementPanels(normalized).find(
    (entry): entry is Extract<MeasurementPanel, { kind: 'todo_measure' }> =>
      entry.kind === 'todo_measure' && entry.measureGroupId === measureGroupId,
  )
  if (!panel) return normalized

  const allTodos = panel.lists.flatMap((list) => list.todos)
  const reweighted = redistributeMilestoneListWeights(allTodos, nextWeight)
  let cursor = 0
  const next = normalized.flatMap((item) => {
    if (
      item.kind !== 'milestone' ||
      milestoneMeasureGroupId(item) !== measureGroupId
    ) {
      return [item]
    }
    const replacement = reweighted[cursor]
    cursor += 1
    return replacement ? [replacement] : []
  })
  return next
}

export function sumPanelWeights(measurements: Measurement[]): number {
  return measurementPanels(measurements).reduce((sum, panel) => {
    if (panel.kind === 'metric') return sum + panel.metric.weight
    return sum + panel.weight
  }, 0)
}

export function blankMetric(
  strategy: MetricStrategy = 'increase',
  weight = 0,
): Metric {
  return {
    id: createId('metric'),
    kind: 'metric',
    title: '',
    weight,
    unit: 'number',
    direction: strategy,
    startValue: undefined,
    targetValue: undefined,
    currentValue: undefined,
    rangeMin: undefined,
    rangeMax: undefined,
  }
}

export function blankGoal(options?: {
  withDefaultMetric?: boolean
  ownerId?: string
}): Goal {
  const withDefaultMetric = options?.withDefaultMetric ?? false
  return {
    id: createId('goal'),
    description: '',
    weight: 0,
    ownerId: options?.ownerId,
    measurements: withDefaultMetric ? appendMilestoneList([]) : [],
  }
}

/** Split 100% evenly across top-level measures. */
export function rebalanceMeasurementWeights(
  measurements: Measurement[],
): Measurement[] {
  const normalized = normalizeMilestoneListIds(measurements)
  if (normalized.length === 0) return normalized

  const panels = measurementPanels(normalized)
  const each = Math.floor(100 / panels.length)
  const remainder = 100 - each * panels.length
  const rebalanced: Measurement[] = []

  panels.forEach((panel, panelIndex) => {
    const panelWeight = each + (panelIndex === panels.length - 1 ? remainder : 0)
    if (panel.kind === 'metric') {
      rebalanced.push({ ...panel.metric, weight: panelWeight })
      return
    }
    const allTodos = panel.lists.flatMap((list) => list.todos)
    rebalanced.push(
      ...redistributeMilestoneListWeights(allTodos, panelWeight),
    )
  })

  return rebalanced
}

export function applyMetricStrategy(
  metric: Metric,
  strategy: MetricStrategy,
): Metric {
  const next: Metric = {
    ...metric,
    direction: strategy,
  }

  if (strategy === 'between') {
    return {
      ...next,
      rangeMin: metric.rangeMin ?? metric.startValue,
      rangeMax: metric.rangeMax ?? metric.targetValue,
    }
  }

  if (strategy === 'keep_above') {
    const threshold = metric.rangeMin ?? metric.targetValue
    return {
      ...next,
      rangeMin: threshold,
      rangeMax: undefined,
      targetValue: threshold,
    }
  }

  if (strategy === 'keep_below') {
    const threshold = metric.rangeMax ?? metric.targetValue
    return {
      ...next,
      rangeMax: threshold,
      rangeMin: undefined,
      targetValue: threshold,
    }
  }

  return {
    ...next,
    rangeMin: undefined,
    rangeMax: undefined,
  }
}

export function metricUsesRange(strategy: MetricStrategy): boolean {
  return (
    strategy === 'between' ||
    strategy === 'keep_above' ||
    strategy === 'keep_below'
  )
}

export function metricLowerLabel(strategy: MetricStrategy): string {
  if (strategy === 'increase' || strategy === 'decrease') return 'Start value'
  if (strategy === 'keep_below') return 'Lower limit'
  return 'Lower limit'
}

export function metricUpperLabel(strategy: MetricStrategy): string {
  if (strategy === 'increase' || strategy === 'decrease') return 'Target value'
  if (strategy === 'keep_above') return 'Upper limit'
  return 'Upper limit'
}

export type TodoListPanel = {
  listKey: string
  listTitle: string
  todos: Milestone[]
}

/**
 * Metrics stay in list order. Milestones group by measureGroupId, then by listId
 * so one measure can contain multiple named todo lists.
 */
export type MeasurementPanel =
  | { key: string; kind: 'metric'; metric: Metric }
  | {
    key: string
    kind: 'todo_measure'
    measureGroupId: string
    title: string
    weight: number
    lists: TodoListPanel[]
  }

function todoListsFromItems(items: Milestone[]): TodoListPanel[] {
  const lists: TodoListPanel[] = []
  const seenListIds = new Set<string>()
  for (const item of items) {
    const listKey = milestoneListId(item)
    if (seenListIds.has(listKey)) continue
    seenListIds.add(listKey)
    lists.push({
      listKey,
      listTitle: milestoneListTitle(
        items.filter(
          (entry) => milestoneListId(entry) === listKey,
        ),
      ),
      todos: items.filter((entry) => milestoneListId(entry) === listKey),
    })
  }
  return lists
}

export function todoMeasureItems(
  panel: Extract<MeasurementPanel, { kind: 'todo_measure' }>,
): Milestone[] {
  return panel.lists.flatMap((list) => list.todos)
}

function mergeTodoMeasurePanels(panels: MeasurementPanel[]): MeasurementPanel[] {
  const merged: MeasurementPanel[] = []
  const indexByGroup = new Map<string, number>()

  for (const panel of panels) {
    if (panel.kind === 'metric') {
      merged.push(panel)
      continue
    }

    const existingIndex = indexByGroup.get(panel.measureGroupId)
    if (existingIndex === undefined) {
      indexByGroup.set(panel.measureGroupId, merged.length)
      merged.push(panel)
      continue
    }

    const existing = merged[existingIndex]
    if (existing.kind !== 'todo_measure') continue

    const listsByKey = new Map(existing.lists.map((list) => [list.listKey, list]))
    for (const list of panel.lists) {
      const previous = listsByKey.get(list.listKey)
      if (previous) {
        previous.todos = [...previous.todos, ...list.todos]
      } else {
        listsByKey.set(list.listKey, {
          ...list,
          todos: [...list.todos],
        })
      }
    }

    merged[existingIndex] = {
      ...existing,
      title: existing.title || panel.title,
      weight: existing.weight + panel.weight,
      lists: [...listsByKey.values()],
    }
  }

  return merged
}

export function measurementPanels(
  measurements: Measurement[],
): MeasurementPanel[] {
  const normalized = normalizeMilestoneListIds(measurements)
  const panels: MeasurementPanel[] = []
  let index = 0

  while (index < normalized.length) {
    const measurement = normalized[index]
    if (measurement.kind === 'metric') {
      panels.push({
        key: measurement.id,
        kind: 'metric',
        metric: measurement,
      })
      index += 1
      continue
    }

    const run: Milestone[] = []
    while (index < normalized.length && normalized[index].kind === 'milestone') {
      run.push(normalized[index] as Milestone)
      index += 1
    }

    const groupOrder: string[] = []
    const groups = new Map<string, Milestone[]>()
    for (const item of run) {
      const groupId = milestoneMeasureGroupId(item)
      if (!groups.has(groupId)) {
        groupOrder.push(groupId)
        groups.set(groupId, [])
      }
      groups.get(groupId)?.push(item)
    }

    for (const groupId of groupOrder) {
      const items = groups.get(groupId) ?? []
      const lists = todoListsFromItems(items)
      panels.push({
        key: groupId,
        kind: 'todo_measure',
        measureGroupId: groupId,
        title: measureGroupTitle(items),
        weight: items.reduce((sum, item) => sum + item.weight, 0),
        lists,
      })
    }
  }

  return mergeTodoMeasurePanels(panels)
}

export function hasMeasurePanelName(panel: MeasurementPanel): boolean {
  if (panel.kind === 'metric') return Boolean(panel.metric.title.trim())
  return Boolean(panel.title.trim())
}

export function goalMeasureNamesComplete(measurements: Measurement[]): boolean {
  if (measurements.length === 0) return true
  return measurementPanels(measurements).every(hasMeasurePanelName)
}
