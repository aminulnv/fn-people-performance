import { describe, expect, it } from 'vitest'
import {
  compareGroupsByNameRelevance,
  nameRelevanceScore,
} from './nameRelevance'

describe('nameRelevanceScore', () => {
  it('ranks an exact name above a description match', () => {
    expect(nameRelevanceScore('People and Culture', [], 'people and culture')).toBe(
      0,
    )
    expect(
      nameRelevanceScore(
        'Sheikh Syed Ahmed',
        ['Engineer', 'People and Culture'],
        'people and culture',
      ),
    ).toBe(3)
  })
})

describe('compareGroupsByNameRelevance', () => {
  it('puts the closest section first', () => {
    const compare = compareGroupsByNameRelevance(['People', 'Departments'])
    const people = {
      section: 'People',
      items: [{ score: 3 }],
    }
    const departments = {
      section: 'Departments',
      items: [{ score: 0 }],
    }
    expect(compare(departments, people)).toBeLessThan(0)
  })
})
