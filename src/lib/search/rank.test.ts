import { describe, expect, it } from 'vitest'
import { presentSearchResults, scoreSearchItem } from './rank'
import type { SearchItem } from './types'

function item(
  partial: Pick<SearchItem, 'id' | 'kind' | 'scope' | 'label'> &
    Partial<SearchItem>,
): SearchItem {
  return {
    keywords: [],
    path: `/${partial.id}`,
    ...partial,
  }
}

const catalog: SearchItem[] = [
  item({
    id: 'person:1',
    kind: 'person',
    scope: 'people',
    label: 'Ada Lovelace',
    description: 'Engineer · Platform',
    keywords: ['1', 'ada@example.com', 'Engineer'],
  }),
  item({
    id: 'goal:1',
    kind: 'goal',
    scope: 'goals',
    label: 'Reduce checkout drop-off',
    description: 'Ada Lovelace · Q3 2026',
    keywords: ['checkout'],
  }),
  item({
    id: 'page:goals',
    kind: 'page',
    scope: 'pages',
    label: 'Goals',
    path: '/goals',
  }),
  item({
    id: 'action:my-goals',
    kind: 'action',
    scope: 'actions',
    label: 'Go to my goals',
    path: '/goals/q3/1',
  }),
]

describe('scoreSearchItem', () => {
  it('requires every token to match across fields', () => {
    const hit = scoreSearchItem(catalog[0], 'ada engineer')
    expect(hit).not.toBeNull()
    expect(hit!.highlights).toEqual([{ start: 0, end: 3 }])
    expect(scoreSearchItem(catalog[0], 'ada missing')).toBeNull()
  })

  it('ranks a name match above a manager-keyword match', () => {
    const named = item({
      id: 'person:tajrian',
      kind: 'person',
      scope: 'people',
      label: 'Tajrian Rahman',
      description: 'Manager I · Client Experience',
      keywords: ['Client Experience'],
    })
    const report = item({
      id: 'person:jessica',
      kind: 'person',
      scope: 'people',
      label: 'Jessica Dehoedt',
      description: 'Executive · Client Experience',
      keywords: ['Client Experience', 'Tajrian Rahman'],
    })
    const byName = scoreSearchItem(named, 'tajrian')
    const byManager = scoreSearchItem(report, 'tajrian')
    expect(byName).not.toBeNull()
    expect(byManager).not.toBeNull()
    expect(byName!.score).toBeGreaterThan(byManager!.score)
  })

  it('boosts an exact employee id above other numeric matches', () => {
    const withId = item({
      id: 'person:42',
      kind: 'person',
      scope: 'people',
      label: 'Ada Lovelace',
      keywords: ['42', 'ada@example.com'],
    })
    const withNumberInTitle = item({
      id: 'person:7',
      kind: 'person',
      scope: 'people',
      label: 'Grace Hopper',
      description: 'Engineer · Team 42',
      keywords: ['7'],
    })
    const byId = scoreSearchItem(withId, '42')
    const byDescription = scoreSearchItem(withNumberInTitle, '42')
    expect(byId).not.toBeNull()
    expect(byDescription).not.toBeNull()
    expect(byId!.score).toBeGreaterThan(byDescription!.score)
  })
})

describe('presentSearchResults', () => {
  it('shows recents and jump-to items when the query is empty', () => {
    const presented = presentSearchResults(catalog, '', 'all', ['goal:1'])
    expect(presented.groups.map((group) => group.id)).toEqual([
      'recent',
      'action',
      'page',
    ])
    expect(presented.groups[0].items[0].id).toBe('goal:1')
  })

  it('filters to a chip and ranks matches', () => {
    const presented = presentSearchResults(catalog, 'ada', 'people')
    expect(presented.flat.map((entry) => entry.id)).toEqual(['person:1'])
  })

  it('lets a prefix override the chip', () => {
    const presented = presentSearchResults(catalog, 'g: checkout', 'people')
    expect(presented.scope).toBe('goals')
    expect(presented.flat.map((entry) => entry.id)).toEqual(['goal:1'])
  })

  it('puts the named person first when reports also match the manager', () => {
    const people: SearchItem[] = [
      item({
        id: 'person:jessica',
        kind: 'person',
        scope: 'people',
        label: 'Jessica Dehoedt',
        description: 'Executive · Client Experience',
        keywords: ['Tajrian Rahman'],
      }),
      item({
        id: 'person:pafsin',
        kind: 'person',
        scope: 'people',
        label: 'Pafsin Akter Prithy',
        description: 'Sr. Executive · Client Experience',
        keywords: ['Tajrian Rahman'],
      }),
      item({
        id: 'person:tajrian',
        kind: 'person',
        scope: 'people',
        label: 'Tajrian Rahman',
        description: 'Manager I · Client Experience',
        keywords: ['Client Experience'],
      }),
      item({
        id: 'goal:1',
        kind: 'goal',
        scope: 'goals',
        label: 'Improve CX coverage',
        description: 'Tajrian Rahman · Q3 2026',
        keywords: ['Tajrian Rahman'],
      }),
    ]
    const presented = presentSearchResults(people, 'tajrian', 'all')
    expect(presented.flat[0]?.id).toBe('person:tajrian')
    expect(presented.groups[0]?.id).toBe('person')
  })
})
