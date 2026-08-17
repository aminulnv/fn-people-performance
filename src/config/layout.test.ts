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
})
