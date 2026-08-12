import type { LucideIcon } from 'lucide-react'
import { BarChart3, Home, LayoutDashboard, Star, Target, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui'

type ComingSoonConfig = {
  title: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  action?: { to: string; label: string }
}

const PAGES = {
  home: {
    title: 'Home',
    icon: Home,
    emptyTitle: 'Coming soon',
    emptyDescription:
      'Updates, priorities, and quick links across people, goals, and reviews will land here.',
    action: { to: '/people', label: 'Go to People' },
  },
  reviews: {
    title: 'Reviews',
    icon: Star,
    emptyTitle: 'Coming soon',
    emptyDescription:
      'Review cycles and feedback will live here. Keep goals current until this module ships.',
    action: { to: '/goals', label: 'Go to Goals' },
  },
  analytics: {
    title: 'Analytics',
    icon: BarChart3,
    emptyTitle: 'Coming soon',
    emptyDescription:
      'Completion rates, org-wide trends, and reporting will appear here once available.',
    action: { to: '/goals', label: 'Go to Goals' },
  },
  dashboard: {
    title: 'Dashboard',
    icon: LayoutDashboard,
    emptyTitle: 'Coming soon',
    emptyDescription:
      'A focused summary of people, goals, and reviews will show here. Browse People or Goals in the meantime.',
    action: { to: '/people', label: 'Go to People' },
  },
} as const satisfies Record<string, ComingSoonConfig>

export type ComingSoonPageId = keyof typeof PAGES

export default function ComingSoonPage({ page }: { page: ComingSoonPageId }) {
  const config = PAGES[page]

  return (
    <div className="pd-page pd-page--coming-soon" aria-label={config.title}>
      <EmptyState
        icon={config.icon}
        title={config.emptyTitle}
        description={config.emptyDescription}
        action={
          config.action ? (
            <Link
              to={config.action.to}
              className="pd-btn pd-btn--primary pd-btn--md"
            >
              <span className="pd-btn__label">{config.action.label}</span>
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}

/** Shared empty copy for employee profile tabs that are not built yet. */
export const profileTabComingSoon = {
  performance: {
    title: 'Performance coming soon',
    descriptionSelf:
      'Ratings, review history, and feedback will appear here.',
    descriptionOther:
      'Ratings, review history, and feedback for this employee will appear here.',
    icon: Star,
  },
  goals: {
    title: 'Goals coming soon',
    descriptionSelf:
      'Your goal progress will show here. Use Goals in the sidebar for the full cycle view.',
    descriptionOther:
      'Goal progress for this employee will show here. Use Goals in the sidebar for the full cycle view.',
    icon: Target,
  },
  team: {
    title: 'Team coming soon',
    descriptionSelf:
      'Your direct reports and team structure will appear here.',
    descriptionOther:
      'Direct reports and team structure for this employee will appear here.',
    icon: Users,
  },
} as const
