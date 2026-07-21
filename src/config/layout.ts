import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  Settings,
  UserRound,
} from 'lucide-react'
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
    icon: LayoutDashboard,
    logoUrl: '/images/logo.png',
  },
  navItems: [
    { path: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { path: '/people', label: 'People', icon: Users },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ],
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...layoutConfig.navItems,
  profileNavItem,
  settingsNavItem,
]
