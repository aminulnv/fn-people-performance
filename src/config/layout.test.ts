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

  it('hides Calibration without All read or All read + write access', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [])
    expect(visible.some((item) => item.path === '/calibration')).toBe(false)
  })

  it('shows Calibration to All read access', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [
      'platform.read_all',
    ])
    expect(visible.some((item) => item.path === '/calibration')).toBe(true)
  })

  it('shows Analytics to people with All read access', () => {
    const visible = navItemsForPermissions(layoutConfig.navItems, [
      'platform.read_all',
    ])
    expect(visible.some((item) => item.path === '/analytics')).toBe(true)
  })
})
