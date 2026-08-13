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

  it('uses people-v2 as the People root on redesign routes', () => {
    expect(
      buildBreadcrumbs({
        pathname: '/people-v2/7',
        navItems,
        employeeName: 'Grace Hopper',
      }),
    ).toEqual([
      { label: 'People', href: '/people-v2' },
      { label: 'Grace Hopper' },
    ])
  })
})

describe('resolveTopBarIcon', () => {
  it('resolves the People icon for people-v2 routes', () => {
    expect(resolveTopBarIcon('/people-v2/1', navItems)).toBe(Users)
  })
})
