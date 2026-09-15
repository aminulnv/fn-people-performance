import { useMemo } from 'react'
import { HomeBanner } from '@/components/home/HomeBanner'
import type { HomeBannerContent } from '@/lib/home/homeBanner'
import { useEmployees } from '@/lib/employees/useEmployees'
import '@/styles/layout-home.css'

const BORHAN_NAME = 'Aminul Islam Borhan'
const BORHAN_EMPLOYEE_ID = 754

const DEFAULT_TIMER = [
  { label: 'Days', value: '24' },
  { label: 'Hours', value: '53' },
  { label: 'Mins', value: '18' },
]

function buildPreviewBanners(borhanAvatarUrl?: string): HomeBannerContent[] {
  return [
    {
      id: 'preview:set_goals',
      variant: 'set_goals',
      cycleId: 'q3-2026',
      personId: 'preview',
      headline: 'Set your Q3 2026 Goals',
      subline: 'Before ',
      sublineEmphasis: '27th August 2026',
      href: '/goals',
      icon: 'none',
      artwork: 'calendar',
      urgency: 'default',
      timing: 'upcoming',
      aside: {
        kind: 'countdown',
        primary: '24 Days',
        secondary: 'Remaining',
        units: DEFAULT_TIMER,
      },
      ariaLabel: 'Set your Q3 2026 Goals. Before 27th August 2026.',
    },
    {
      id: 'preview:submit_goals',
      variant: 'set_goals',
      cycleId: 'q3-2026',
      personId: 'preview',
      headline: 'Submit your Q3 2026 Goals',
      subline: 'Before ',
      sublineEmphasis: '27th August 2026',
      href: '/goals',
      icon: 'none',
      artwork: 'calendar',
      urgency: 'default',
      timing: 'upcoming',
      aside: {
        kind: 'countdown',
        primary: '24 Days',
        secondary: 'Remaining',
        units: DEFAULT_TIMER,
      },
      ariaLabel: 'Submit your Q3 2026 Goals. Before 27th August 2026.',
    },
    {
      id: 'preview:approve',
      variant: 'approve_team_goals',
      cycleId: 'q3-2026',
      personId: 'preview',
      headline: "Approve your team's Q3 Goals",
      subline: 'Before ',
      sublineEmphasis: '27th August 2026',
      href: '/goals/q3-2026/preview#my-reports',
      icon: 'none',
      artwork: 'approve',
      urgency: 'default',
      timing: 'upcoming',
      aside: {
        kind: 'countdown',
        primary: '24 Days',
        secondary: 'Remaining',
        units: DEFAULT_TIMER,
      },
      ariaLabel: "Approve your team's Q3 Goals. Before 27th August 2026.",
    },
    {
      id: 'preview:modify_goals',
      variant: 'modify_goals',
      cycleId: 'q3-2026',
      personId: 'preview',
      headline: 'Your Goals Were Sent Back',
      subline: `${BORHAN_NAME} sent your goals back.`,
      sublineActor: {
        name: BORHAN_NAME,
        avatarUrl: borhanAvatarUrl,
      },
      href: '/goals',
      icon: 'none',
      artwork: 'return',
      aside: {
        kind: 'action',
        primary: 'Modify Now',
        secondary: '',
      },
      ariaLabel: `Your goals were sent back. ${BORHAN_NAME} sent your goals back.`,
    },
    {
      id: 'preview:update_progress',
      variant: 'update_progress',
      cycleId: 'q3-2026',
      personId: 'preview',
      headline: 'Update Goal Progress',
      subline: 'Due by ',
      sublineEmphasis: '30th September 2026',
      href: '/goals',
      icon: 'none',
      artwork: 'logbook',
      aside: {
        kind: 'action',
        primary: 'Update Now',
        secondary: '',
      },
      ariaLabel: 'Update goal progress, due by 30th September 2026.',
    },
  ]
}

export default function HomePage() {
  const { employees } = useEmployees()
  const banners = useMemo(() => {
    const borhan = employees.find(
      (employee) =>
        employee.employeeId === BORHAN_EMPLOYEE_ID ||
        employee.fullName.trim().toLowerCase() === BORHAN_NAME.toLowerCase(),
    )
    return buildPreviewBanners(borhan?.avatarUrl || undefined)
  }, [employees])

  return (
    <div className="pd-page pd-page--home pd-page--home-multiple">
      {banners.map((banner) => (
        <HomeBanner key={banner.id} content={banner} />
      ))}
    </div>
  )
}
