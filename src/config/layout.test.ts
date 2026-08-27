import { describe, expect, it } from 'vitest'
import { layoutConfig, navItemsForPermissions } from './layout'

describe('navItemsForPermissions', () => {
  it('hides Cycles without platform.write_all', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [
      'platform.read_all',
    ])
    expect(visible.some((item) => item.path === '/cycles')).toBe(false)
  })

  it('shows Cycles with platform.write_all', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [
      'platform.write_all',
    ])
    expect(visible.some((item) => item.path === '/cycles')).toBe(true)
  })

  it('hides Analytics without platform.read_all', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [])
    expect(visible.some((item) => item.path === '/analytics')).toBe(false)
  })

  it('shows Analytics to Settings admins with platform.read_all', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [
      'platform.read_all',
    ])
    expect(visible.some((item) => item.path === '/analytics')).toBe(true)
  })
})
