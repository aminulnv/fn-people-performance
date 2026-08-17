import type { LucideIcon } from 'lucide-react'
import type { SystemPermission } from '@/lib/accessControl/types'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Sidebar shows a right-aligned construction marker when true. */
  comingSoon?: boolean
  /** When set, the item is hidden unless the user has this permission. */
  requiredPermission?: SystemPermission
}

export interface BrandConfig {
  name: string
  subtitle?: string
  icon: LucideIcon
  logoUrl?: string
}

export interface AppLayoutConfig {
  navItems: NavItem[]
  brand: BrandConfig
}
