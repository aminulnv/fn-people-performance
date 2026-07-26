import { Component, Home, LayoutDashboard, Settings, UserRound } from 'lucide-react'
import type { AppLayoutConfig, NavItem } from '@/layout/types'

export const profileNavItem: NavItem = {
  path: '/profile',
  label: 'My Profile',
  icon: UserRound,
}

export const settingsNavItem: NavItem = {
  path: '/settings',
  label: 'Settings',
  icon: Settings,
}

export const layoutConfig: AppLayoutConfig = {
  brand: {
    name: 'People Performance',
    icon: Component,
    logoUrl: '/images/logo.png',
  },
  navItems: [
    { path: '/', label: 'Home', icon: Home, end: true },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/components', label: 'Components', icon: Component },
  ],
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...layoutConfig.navItems,
  profileNavItem,
  settingsNavItem,
]
