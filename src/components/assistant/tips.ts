export type AssistantTip = {
  title: string
  body: string
}

const DEFAULT_TIP: AssistantTip = {
  title: 'Need a hand?',
  body: 'I can share quick tips as you move around People Performance. Click me anytime.',
}

const TIPS_BY_PATH: Record<string, AssistantTip> = {
  '/': {
    title: 'Welcome back',
    body: 'Start from Home to jump into goals, reviews, and people updates in one place.',
  },
  '/dashboard': {
    title: 'Your pulse check',
    body: 'Dashboard tiles summarize progress at a glance — drill into any metric that looks off.',
  },
  '/people': {
    title: 'Find your people',
    body: 'Browse the employee directory, or use Create employee to add someone new.',
  },
  '/people/:employeeId/edit': {
    title: 'Edit employee',
    body: 'Update directory fields for this person. Employee ID stays fixed.',
  },
  '/people/new': {
    title: 'Add someone carefully',
    body: 'Employee ID and email must be unique — fill the org fields so reporting lines stay clear.',
  },
  '/organisation': {
    title: 'See the structure',
    body: 'Organisation helps you understand teams, reporting lines, and where work sits.',
  },
  '/organisation/chart': {
    title: 'Follow the reporting line',
    body: 'The org chart is built from Reports to. Expand a leader to see who reports to them.',
  },
  '/goals': {
    title: 'Keep goals alive',
    body: 'Update goal progress often — small check-ins beat big end-of-cycle surprises.',
  },
  '/reviews': {
    title: 'Review with context',
    body: 'Bring recent goals and feedback into reviews so conversations stay concrete.',
  },
  '/analytics': {
    title: 'Read the signals',
    body: 'Analytics highlights trends over time — look for patterns, not one-off blips.',
  },
  '/engagement': {
    title: 'Stay engaged',
    body: 'Engagement tools help you listen early and act before motivation dips.',
  },
  '/settings': {
    title: 'Make it yours',
    body: 'Tune appearance and preferences here so the workspace fits how you work.',
  },
  '/profile': {
    title: 'Your profile',
    body: 'Keep your profile current so managers and teammates know how to reach you.',
  },
  '/organisation/departments/:departmentId': {
    title: 'Department view',
    body: 'See the owner, teams, and everyone in this department — click a team to go deeper.',
  },
  '/organisation/teams/:teamId': {
    title: 'Team view',
    body: 'Review this team’s owner and members, or jump back to the parent department.',
  },
  '/components': {
    title: 'Design system playground',
    body: 'This page showcases shared UI pieces — reuse them so the product stays consistent.',
  },
}

function pathMatchesTipKey(pathname: string, tipKey: string): boolean {
  if (tipKey === '/') return pathname === '/'
  if (!tipKey.includes(':')) {
    return pathname === tipKey || pathname.startsWith(`${tipKey}/`)
  }

  const pattern = tipKey
    .split('/')
    .map((segment) =>
      segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('/')
  return new RegExp(`^${pattern}/?$`).test(pathname)
}

export function tipForPath(pathname: string): AssistantTip {
  if (TIPS_BY_PATH[pathname]) return TIPS_BY_PATH[pathname]

  const match = Object.keys(TIPS_BY_PATH)
    .filter((path) => path !== '/')
    .sort((a, b) => b.length - a.length)
    .find((path) => pathMatchesTipKey(pathname, path))

  return match ? TIPS_BY_PATH[match] : DEFAULT_TIP
}
