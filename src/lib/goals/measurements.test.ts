import { describe, expect, it } from 'vitest'
import {
  applyMetricStrategy,
  appendMilestoneList,
  coalesceMeasureGroups,
  appendMilestoneToList,
  appendTodoListToMeasure,
  blankGoal,
  blankMetric,
  blankMilestone,
  measurementPanels,
  normalizeMetricStrategy,
  rebalanceMeasurementWeights,
  setMeasurementPanelWeight,
  canEditMeasurementWeights,
  lockSoloMeasurementWeights,
  removeMilestoneList,
  removeTodoMeasure,
  readMeasureGroupTitle,
  readMilestoneListTitle,
  readMilestoneTitle,
  patchMilestone,
  sumPanelWeights,
  withMeasureTitle,
  withMilestoneTitle,
  uniqueMilestonesById,
} from './measurements'
import { measurementProgress } from './weightage'
import type { Metric } from './types'

function metric(partial: Partial<Metric> & Pick<Metric, 'direction'>): Metric {
  return {
    id: 'm1',
    kind: 'metric',
    title: 'Metric',
    weight: 100,
    unit: 'number',
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    ...partial,
  }
}

describe('normalizeMetricStrategy', () => {
  it('maps legacy directions to Revolut strategies', () => {
    expect(normalizeMetricStrategy('greater_than')).toBe('increase')
    expect(normalizeMetricStrategy('less_than')).toBe('decrease')
    expect(normalizeMetricStrategy('within_range')).toBe('between')
  })

  it('keeps modern strategies unchanged', () => {
    expect(normalizeMetricStrategy('keep_above')).toBe('keep_above')
    expect(normalizeMetricStrategy('keep_below')).toBe('keep_below')
    expect(normalizeMetricStrategy('increase')).toBe('increase')
  })
})

describe('measurementProgress strategies', () => {
  it('interpolates increase toward the target', () => {
    expect(
      measurementProgress(
        metric({
          direction: 'increase',
          startValue: 0,
          targetValue: 100,
          currentValue: 40,
        }),
      ),
    ).toBe(40)
  })

  it('scores milestones as complete or not', () => {
    expect(
      measurementProgress({
        id: 'ms1',
        kind: 'milestone',
        title: 'Ship',
        weight: 100,
        complete: true,
      }),
    ).toBe(100)
    expect(
      measurementProgress({
        id: 'ms2',
        kind: 'milestone',
        title: 'Ship',
        weight: 100,
        complete: false,
      }),
    ).toBe(0)
  })
})

describe('measurement factories', () => {
  it('creates blank metric and milestone shapes', () => {
    const numberMetric = blankMetric('between', 50)
    expect(numberMetric.kind).toBe('metric')
    expect(numberMetric.direction).toBe('between')
    expect(numberMetric.weight).toBe(50)

    const milestone = blankMilestone(25)
    expect(milestone.kind).toBe('milestone')
    expect(milestone.weight).toBe(25)
    expect(milestone.complete).toBe(false)
  })

  it('rebalances mixed measurement modes evenly to 100', () => {
    const balanced = rebalanceMeasurementWeights([
      blankMetric('increase'),
      blankMilestone(),
      blankMetric('decrease'),
    ])
    expect(balanced.map((m) => m.weight)).toEqual([33, 33, 34])
  })

  it('locks a single measure at 100% and ignores weight edits', () => {
    const metricA = { ...blankMetric('increase', 40), id: 'm-a' }
    expect(canEditMeasurementWeights([metricA])).toBe(false)
    expect(lockSoloMeasurementWeights([metricA])).toEqual([
      expect.objectContaining({ id: 'm-a', weight: 100 }),
    ])
    expect(setMeasurementPanelWeight([metricA], 'm-a', 25)).toEqual([
      expect.objectContaining({ id: 'm-a', weight: 100 }),
    ])
  })

  it('splits 100% when a second top-level measure is added', () => {
    const first = { ...blankMetric('increase', 100), id: 'm-a' }
    const next = appendMilestoneList([first])
    expect(canEditMeasurementWeights(next)).toBe(true)
    expect(sumPanelWeights(next)).toBe(100)
    expect(
      measurementPanels(next).map((panel) =>
        panel.kind === 'metric' ? panel.metric.weight : panel.weight,
      ),
    ).toEqual([50, 50])
  })

  it('sets a metric panel weight without touching sibling measures', () => {
    const metricA = { ...blankMetric('increase', 40), id: 'm-a' }
    const metricB = { ...blankMetric('decrease', 60), id: 'm-b' }
    const next = setMeasurementPanelWeight([metricA, metricB], 'm-a', 25)

    expect(next).toEqual([
      expect.objectContaining({ id: 'm-a', weight: 25 }),
      expect.objectContaining({ id: 'm-b', weight: 60 }),
    ])
  })

  it('sets a todo measure weight across its checklist items', () => {
    const measurements = [
      { ...blankMetric('increase', 40), id: 'm-a' },
      { ...blankMilestone(30), id: 't1', measureGroupId: 'mg1', listId: 'l1' },
      { ...blankMilestone(30), id: 't2', measureGroupId: 'mg1', listId: 'l1' },
    ]
    const next = setMeasurementPanelWeight(measurements, 'mg1', 50)

    expect(next.find((item) => item.id === 'm-a')?.weight).toBe(40)
    expect(
      next
        .filter((item) => item.kind === 'milestone')
        .map((item) => item.weight),
    ).toEqual([25, 25])
  })

  it('treats each top-level measure as one allocation bucket', () => {
    const balanced = rebalanceMeasurementWeights([
      blankMetric('increase'),
      blankMilestone(),
      blankMilestone(),
      blankMetric('between'),
    ])

    expect(balanced.map((measurement) => measurement.weight)).toEqual([
      25, 25, 25, 25,
    ])
    expect(sumPanelWeights(balanced)).toBe(100)
  })

  it('applies strategy-specific range defaults', () => {
    const base = blankMetric('increase', 100)
    base.startValue = 5
    base.targetValue = 15

    const between = applyMetricStrategy(base, 'between')
    expect(between.direction).toBe('between')
    expect(between.rangeMin).toBe(5)
    expect(between.rangeMax).toBe(15)
  })

  it('starts new goals with no default measure', () => {
    const goal = blankGoal()
    expect(goal.measurements).toEqual([])
  })

  it('can opt into a default milestone measure', () => {
    const goal = blankGoal({ withDefaultMetric: true })
    expect(goal.measurements).toHaveLength(1)
    expect(goal.measurements[0]?.kind).toBe('milestone')
    expect(goal.measurements[0]?.weight).toBe(100)
  })
})

describe('measurementPanels', () => {
  it('groups multiple todo lists under one measure row', () => {
    const measureGroupId = 'measure-1'
    const listOne = blankMilestone(0, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listTitle: 'Todo list 1',
    })
    const listOneTask = blankMilestone(0, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listId: listOne.listId,
      listTitle: 'Todo list 1',
    })
    const listTwo = blankMilestone(0, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listTitle: 'Todo list 2',
    })
    const metricTwo = blankMetric('decrease')
    const panels = measurementPanels([
      listOne,
      listOneTask,
      listTwo,
      metricTwo,
    ])

    expect(panels.map((panel) => panel.kind)).toEqual([
      'todo_measure',
      'metric',
    ])
    expect(panels[0]).toMatchObject({
      kind: 'todo_measure',
      title: 'Metric 1',
      lists: [
        expect.objectContaining({ listTitle: 'Todo list 1', todos: expect.any(Array) }),
        expect.objectContaining({ listTitle: 'Todo list 2', todos: expect.any(Array) }),
      ],
    })
  })

  it('supports adding a new top-level milestone measure', () => {
    const metricItem = blankMetric('increase')
    const firstList = blankMilestone()
    const withSecondMeasure = appendMilestoneList([metricItem, firstList])
    const panels = measurementPanels(withSecondMeasure)

    expect(panels).toHaveLength(3)
    expect(panels[1]?.kind).toBe('todo_measure')
    expect(panels[2]?.kind).toBe('todo_measure')
  })

  it('adds another todo list inside the same measure', () => {
    const measureGroupId = 'measure-1'
    const first = blankMilestone(0, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listTitle: 'Todo list 1',
    })
    const withSecondList = appendTodoListToMeasure([first], measureGroupId, 'Todo list 2')
    const panel = measurementPanels(withSecondList)[0]

    expect(panel?.kind).toBe('todo_measure')
    if (panel?.kind === 'todo_measure') {
      expect(panel.lists).toHaveLength(2)
      expect(panel.lists.map((list) => list.listTitle)).toEqual([
        'Todo list 1',
        'Todo list 2',
      ])
    }
  })

  it('names a single list Task List and numbers it when a second is added', () => {
    const created = appendMilestoneList([])
    const createdPanel = measurementPanels(created)[0]
    expect(createdPanel?.kind).toBe('todo_measure')
    if (createdPanel?.kind === 'todo_measure') {
      expect(createdPanel.lists.map((list) => list.listTitle)).toEqual(['Task List'])
    }

    const groupId =
      createdPanel?.kind === 'todo_measure' ? createdPanel.measureGroupId : ''
    const withSecond = appendTodoListToMeasure(created, groupId)
    const numbered = measurementPanels(withSecond)[0]
    expect(numbered?.kind).toBe('todo_measure')
    if (numbered?.kind === 'todo_measure') {
      expect(numbered.lists.map((list) => list.listTitle)).toEqual([
        'Task List 1',
        'Task List 2',
      ])
    }

    const remaining = removeMilestoneList(
      withSecond,
      numbered && numbered.kind === 'todo_measure'
        ? numbered.lists[1]!.listKey
        : '',
    )
    const collapsed = measurementPanels(remaining)[0]
    expect(collapsed?.kind).toBe('todo_measure')
    if (collapsed?.kind === 'todo_measure') {
      expect(collapsed.lists.map((list) => list.listTitle)).toEqual(['Task List'])
    }
  })

  it('does not rename a custom list when adding another', () => {
    const first = blankMilestone(0, { listTitle: 'Shopping' })
    const next = appendTodoListToMeasure(
      [first],
      first.measureGroupId ?? first.listId ?? first.id,
    )
    const panel = measurementPanels(next)[0]
    expect(panel?.kind).toBe('todo_measure')
    if (panel?.kind === 'todo_measure') {
      expect(panel.lists.map((list) => list.listTitle)).toEqual([
        'Shopping',
        'Task List 1',
      ])
    }
  })

  it('adds items only to the selected checklist', () => {
    const listKey = 'list-1'
    const first = { ...blankMilestone(), id: listKey, listId: listKey }
    const metricItem = blankMetric('increase')
    const measurements = [first, metricItem]
    const next = appendMilestoneToList(measurements, listKey)
    const panel = measurementPanels(next)[0]

    expect(panel?.kind).toBe('todo_measure')
    if (panel?.kind === 'todo_measure') {
      expect(panel.lists[0]?.todos).toHaveLength(2)
    }
  })

  it('removes a checklist without touching other measurements', () => {
    const metricItem = blankMetric('increase')
    const list = blankMilestone()
    const otherList = blankMilestone()
    const measurements = [metricItem, list, otherList]
    const next = removeMilestoneList(measurements, list.listId ?? list.id)

    expect(next.map((item) => item.id)).toEqual([
      metricItem.id,
      otherList.id,
    ])
  })

  it('removes an entire milestone measure', () => {
    const measureGroupId = 'measure-1'
    const listOne = blankMilestone(0, { measureGroupId, measureTitle: 'Metric 1' })
    const listTwo = blankMilestone(0, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listTitle: 'Todo list 2',
    })
    const metricItem = blankMetric('increase')
    const next = removeTodoMeasure([listOne, listTwo, metricItem], measureGroupId)

    expect(next.map((item) => item.id)).toEqual([metricItem.id])
  })

  it('updates the measure title across every list in the group', () => {
    const measureGroupId = 'measure-1'
    const listOne = blankMilestone(0, { measureGroupId, measureTitle: 'Old name' })
    const listTwo = blankMilestone(0, {
      measureGroupId,
      measureTitle: 'Old name',
      listTitle: 'Todo list 2',
    })
    const next = withMeasureTitle([listOne, listTwo], measureGroupId, 'Metric 1')

    expect(next.every((item) => item.measureTitle === 'Metric 1')).toBe(true)
    expect(readMeasureGroupTitle(next, measureGroupId)).toBe('Metric 1')
  })

  it('reads and writes measure titles on legacy milestone rows', () => {
    const milestone = {
      id: 't1',
      kind: 'milestone' as const,
      title: 'Task',
      weight: 100,
      complete: false,
    }
    const next = withMeasureTitle([milestone], 't1', 'ABCD')
    expect(readMeasureGroupTitle(next, 't1')).toBe('ABCD')
  })

  it('reads and writes checklist item titles from stored measurements', () => {
    const listId = 'list-1'
    const milestone = blankMilestone(50, { listId, listTitle: 'Shopping' })
    const next = withMilestoneTitle([milestone], milestone.id, 'Buy milk')

    expect(readMilestoneTitle(next, milestone.id)).toBe('Buy milk')
    expect(readMilestoneListTitle(next, listId)).toBe('Shopping')
  })

  it('patches a milestone without clobbering other fields', () => {
    const milestone = blankMilestone(50, { listTitle: 'Shopping' })
    const titled = withMilestoneTitle([milestone], milestone.id, 'Buy milk')
    const checked = patchMilestone(titled, milestone.id, { complete: true })

    expect(readMilestoneTitle(checked, milestone.id)).toBe('Buy milk')
    expect(checked[0]?.complete).toBe(true)
  })

  it('repairs vegetable and snacks lists split by per-list measure groups', () => {
    const listOne = blankMilestone(50, {
      listTitle: 'Vegetable',
      measureTitle: 'Vegetable',
      title: 'Spinach',
    })
    const listTwo = blankMilestone(50, {
      listTitle: 'Snacks',
      measureTitle: 'Snacks',
      title: 'Chips',
    })
    const corrupted = [listOne, listTwo].map((item) => ({
      ...item,
      measureGroupId: item.listId,
    }))

    const panels = measurementPanels(corrupted)
    expect(panels).toHaveLength(1)
    if (panels[0]?.kind === 'todo_measure') {
      expect(panels[0].lists.map((list) => list.listTitle)).toEqual([
        'Vegetable',
        'Snacks',
      ])
    }
  })

  it('merges split milestone runs that share a measure group', () => {
    const measureGroupId = 'measure-1'
    const listOne = blankMilestone(50, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listTitle: 'Snacks',
    })
    const metric = blankMetric('increase')
    const listTwo = blankMilestone(50, {
      measureGroupId,
      measureTitle: 'Metric 1',
      listTitle: 'Drinks',
    })

    const panels = measurementPanels([listOne, metric, listTwo])
    const todoPanels = panels.filter((panel) => panel.kind === 'todo_measure')
    expect(todoPanels).toHaveLength(1)
    if (todoPanels[0]?.kind === 'todo_measure') {
      expect(todoPanels[0].lists).toHaveLength(2)
    }
  })

  it('dedupes milestones with duplicate ids for display', () => {
    const sharedId = 'ms-dup'
    const listKey = 'list-a'
    const panels = measurementPanels([
      {
        id: sharedId,
        kind: 'milestone',
        listId: listKey,
        listTitle: 'Shopping',
        title: 'First',
        weight: 50,
        complete: true,
      },
      {
        id: sharedId,
        kind: 'milestone',
        listId: listKey,
        listTitle: 'Shopping',
        title: 'Duplicate',
        weight: 50,
        complete: true,
      },
      {
        id: 'ms-other',
        kind: 'milestone',
        listId: listKey,
        listTitle: 'Shopping',
        title: 'Second',
        weight: 0,
        complete: false,
      },
    ])

    expect(panels).toHaveLength(1)
    const panel = panels[0]
    expect(panel.kind).toBe('todo_measure')
    if (panel.kind !== 'todo_measure') return
    expect(uniqueMilestonesById(panel.lists[0].todos)).toHaveLength(2)
  })
})
