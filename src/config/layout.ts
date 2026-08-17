import {
  BarChart3,
  CalendarRange,
  Component,
  Home,
  IdCard,
  Landmark,
  Settings,
  Star,
  Target,
  Users,
} from 'lucide-react'
import type { AppLayoutConfig, NavItem } from '@/layout/types'
import {
  hasSystemPermission,
  type SystemPermission,
} from '@/lib/accessControl/types'
import { publicUrl } from '@/lib/publicUrl'

export const profileNavItem: NavItem = {
  path: '/profile',
  label: 'My Profile',
  icon: IdCard,
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
    logoUrl: publicUrl('images/logo.svg'),
  },
  navItems: [
    { path: '/', label: 'Home', icon: Home, end: true, comingSoon: true },
    profileNavItem,
    { path: '/organisation', label: 'Organisation', icon: Landmark },
    { path: '/people', label: 'People', icon: Users },
    {
      path: '/cycles',
      label: 'Cycles',
      icon: CalendarRange,
      requiredPermission: 'platform.write_all',
    },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/reviews', label: 'Reviews', icon: Star },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, comingSoon: true },
  ],
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...layoutConfig.navItems,
  settingsNavItem,
]

export function navItemsForPermissions(
  items: NavItem[],
  permissions: readonly SystemPermission[] | undefined,
): NavItem[] {
  return items.filter(
    (item) =>
      !item.requiredPermission ||
      hasSystemPermission(permissions, item.requiredPermission),
  )
}
