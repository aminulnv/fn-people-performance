import { describe, expect, it } from 'vitest'
import { Home, Users } from 'lucide-react'
import {
  buildBreadcrumbs,
  resolveTopBarIcon,
} from './buildBreadcrumbs'
import type { NavItem } from './types'

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home, end: true },
  { path: '/people', label: 'People', icon: Users },
  { path: '/organisation', label: 'Organisation', icon: Home },
  { path: '/goals', label: 'Goals', icon: Home },
]

describe('buildBreadcrumbs', () => {
  it('returns a single crumb for top-level nav pages', () => {
    expect(buildBreadcrumbs({ pathname: '/people', navItems })).toEqual([
      { label: 'People' },
    ])
    expect(buildBreadcrumbs({ pathname: '/goals', navItems })).toEqual([
      { label: 'Goals' },
    ])
  })

  it('builds People > employee for profile routes', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/people/42',
        navItems,
        employeeName: 'Ada Lovelace',
      }),
    ).toEqual([
      { label: 'People', href: '/people' },
      { label: 'Ada Lovelace' },
    ])
  })

  it('builds People > employee > Edit for edit routes', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/people/42/edit',
        navItems,
        employeeName: 'Ada Lovelace',
      }),
    ).toEqual([
      { label: 'People', href: '/people' },
      { label: 'Ada Lovelace', href: '/people/42' },
      { label: 'Edit' },
    ])
  })

  it('builds People > Add employee', () => {
    expect(
      buildBreadcrumbs({ pathname: '/people/new', navItems }),
    ).toEqual([
      { label: 'People', href: '/people' },
      { label: 'Add employee' },
    ])
  })

  it('builds Organisation trails for chart, department, and team', () => {
    expect(
      buildBreadcrumbs({ pathname: '/organisation/chart', navItems }),
    ).toEqual([
      { label: 'Organisation', href: '/organisation' },
      { label: 'Org chart' },
    ])

    expect(
      buildBreadcrumbs({
        pathname: '/organisation/departments/eng',
        navItems,
        departmentName: 'Engineering',
      }),
    ).toEqual([
      { label: 'Organisation', href: '/organisation' },
      { label: 'Engineering' },
    ])

    expect(
      buildBreadcrumbs({
        pathname: '/organisation/teams/platform',
        navItems,
        teamName: 'Platform',
      }),
    ).toEqual([
      { label: 'Organisation', href: '/organisation' },
      { label: 'Platform' },
    ])
  })

  it('uses goals-v2 as the Goals root on redesign routes', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/goals-v2/q2-2026/42',
        navItems,
        employeeName: 'Aminul Islam Borhan',
        goalsCycleLabel: 'Q2 2026',
      }),
    ).toEqual([
      { label: 'Goals', href: '/goals-v2' },
      { label: 'Q2 2026', href: '/goals-v2' },
      { label: 'Aminul Islam Borhan' },
    ])
  })

  it('returns a single crumb for the goals-v2 overview', () => {
    expect(buildBreadcrumbs({ pathname: '/goals-v2', navItems })).toEqual([
      { label: 'Goals' },
    ])
  })

  it('builds Performance Cycles > cycle for cycle detail routes', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/cycles/q1-2027/settings',
        navItems: [
          ...navItems,
          { path: '/cycles', label: 'Performance Cycles', icon: Home },
        ],
        cycleName: 'Q1 2027',
      }),
    ).toEqual([
      { label: 'Performance Cycles', href: '/cycles' },
      { label: 'Q1 2027' },
    ])
  })

  it('builds Reviews > Scorecards > cycle > full name for scorecard detail', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/reviews/scorecards/q2-2026/42',
        navItems: [
          ...navItems,
          { path: '/reviews', label: 'Reviews', icon: Home },
        ],
        employeeName: 'Aminul Islam Borhan',
        scorecardCycleLabel: 'Q2 2026',
      }),
    ).toEqual([
      { label: 'Reviews', href: '/reviews/scorecards' },
      { label: 'Scorecards', href: '/reviews/scorecards' },
      { label: 'Q2 2026', href: '/reviews/scorecards' },
      { label: 'Aminul Islam Borhan' },
    ])
  })

  it('builds Goals > cycle > full name for a person goals page', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/goals/q2-2026/42',
        navItems,
        employeeName: 'Aminul Islam Borhan',
        goalsCycleLabel: 'Q2 2026',
      }),
    ).toEqual([
      { label: 'Goals', href: '/goals' },
      { label: 'Q2 2026', href: '/goals' },
      { label: 'Aminul Islam Borhan' },
    ])
  })

  it('keeps Goals > cycle > person when a saved goal is open', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/goals/q2-2026/42/goal-1',
        navItems,
        employeeName: 'Aminul Islam Borhan',
        goalsCycleLabel: 'Q2 2026',
      }),
    ).toEqual([
      { label: 'Goals', href: '/goals' },
      { label: 'Q2 2026', href: '/goals' },
      { label: 'Aminul Islam Borhan' },
    ])
  })

  it('falls back to the cycle id when the goals cycle label is unknown', () => {
    expect(
      buildBreadcrumbs({ pathname: '/goals/q2-2026/42', navItems }),
    ).toEqual([
      { label: 'Goals', href: '/goals' },
      { label: 'q2-2026', href: '/goals' },
      { label: 'Goals' },
    ])
  })
})

describe('resolveTopBarIcon', () => {
  it('resolves the Goals icon for goals-v2 routes', () => {
    expect(resolveTopBarIcon('/goals-v2/q2-2026/42', navItems)).toBe(Home)
  })
})
