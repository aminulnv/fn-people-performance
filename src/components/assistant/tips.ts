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
    body: 'Use People to browse teammates, open profiles, and keep ownership clear.',
  },
  '/organisation': {
    title: 'See the structure',
    body: 'Organisation helps you understand teams, reporting lines, and where work sits.',
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
  '/components': {
    title: 'Design system playground',
    body: 'This page showcases shared UI pieces — reuse them so the product stays consistent.',
  },
}

export function tipForPath(pathname: string): AssistantTip {
  if (TIPS_BY_PATH[pathname]) return TIPS_BY_PATH[pathname]

  const match = Object.keys(TIPS_BY_PATH).find(
    (path) => path !== '/' && (pathname === path || pathname.startsWith(`${path}/`)),
  )

  return match ? TIPS_BY_PATH[match] : DEFAULT_TIP
}
