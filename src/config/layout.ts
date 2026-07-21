import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { AppLayoutConfig } from '@/layout/types'

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
    { path: '/settings', label: 'Settings', icon: Settings },
  ],
}
