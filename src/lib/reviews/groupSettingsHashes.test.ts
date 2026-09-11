import { describe, expect, it } from 'vitest'
import {
  cycleOverlayFromHash,
  groupSettingsFromHash,
  hashForCycleOverlay,
  hashForGroupSettings,
  hashForPeoplePane,
  peoplePaneFromHash,
} from './groupSettingsHashes'

describe('groupSettingsFromHash', () => {
  it('defaults empty hash to people / added', () => {
    expect(groupSettingsFromHash('')).toEqual({
      job: 'people',
      peoplePane: 'added',
      reviewFormOpen: false,
    })
  })

  it('reads people panes and review form', () => {
    expect(groupSettingsFromHash('#people/added')).toEqual({
      job: 'people',
      peoplePane: 'added',
      reviewFormOpen: false,
    })
    expect(groupSettingsFromHash('#review/form')).toEqual({
      job: 'review',
      peoplePane: 'added',
      reviewFormOpen: true,
    })
    expect(groupSettingsFromHash('#goals')).toEqual({
      job: 'goals',
      peoplePane: 'added',
      reviewFormOpen: false,
    })
  })
})

describe('hashForGroupSettings', () => {
  it('writes people and review form hashes', () => {
    expect(
      hashForGroupSettings({
        job: 'people',
        peoplePane: 'added',
        reviewFormOpen: false,
      }),
    ).toBe('people/added')
    expect(
      hashForGroupSettings({
        job: 'review',
        peoplePane: 'added',
        reviewFormOpen: true,
      }),
    ).toBe('review/form')
    expect(
      hashForGroupSettings({
        job: 'calibration',
        peoplePane: 'added',
        reviewFormOpen: false,
      }),
    ).toBe('calibration')
  })
})

describe('cycle overlay hashes', () => {
  it('round-trips group overlays', () => {
    const hash = hashForCycleOverlay({
      kind: 'group',
      groupId: 'group-1',
      job: 'people',
      peoplePane: 'added',
      reviewFormOpen: false,
    })
    expect(hash).toBe('group/group-1/people/added')
    expect(cycleOverlayFromHash(`#${hash}`)).toEqual({
      kind: 'group',
      groupId: 'group-1',
      job: 'people',
      peoplePane: 'added',
      reviewFormOpen: false,
    })
  })

  it('reads cycle details', () => {
    expect(cycleOverlayFromHash('#cycle-details')).toEqual({
      kind: 'cycle-details',
    })
  })
})

describe('people pane mapping', () => {
  it('maps editor panes to hash values', () => {
    expect(peoplePaneFromHash('added')).toBe('selected')
    expect(peoplePaneFromHash('not-added')).toBe('browse')
    expect(hashForPeoplePane('selected')).toBe('added')
    expect(hashForPeoplePane('browse')).toBe('not-added')
  })
})
