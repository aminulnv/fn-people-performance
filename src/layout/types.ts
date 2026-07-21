import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  end?: boolean
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
