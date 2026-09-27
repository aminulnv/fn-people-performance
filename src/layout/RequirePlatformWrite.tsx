import type { ReactNode } from 'react'
import {
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import {
  canViewAllReviews,
  canViewAnalytics,
  hasSystemPermission,
  type SystemPermission,
} from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'

type RequirePermissionProps = {
  permission: SystemPermission
  description: string
  children: ReactNode
}

export function RequirePermission({
  permission,
  description,
  children,
}: RequirePermissionProps) {
  const { user } = useAuth()
  const allowed = hasSystemPermission(user?.permissions, permission)

  if (!allowed) {
    return (
      <PageStatus
        variant="forbidden"
        aria-label="Access denied"
        description={description}
        action={<PageStatusLink to="/" label="Back to home" />}
      />
    )
  }

  return children
}

type RequirePlatformWriteProps = {
  children: ReactNode
}

export function RequirePlatformWrite({ children }: RequirePlatformWriteProps) {
  return (
    <RequirePermission
      permission="platform.write_all"
      description="You do not have permission to manage cycles. Contact an administrator if you need access."
    >
      {children}
    </RequirePermission>
  )
}

type RequirePlatformReadProps = {
  children: ReactNode
}

export function RequirePlatformRead({ children }: RequirePlatformReadProps) {
  const { user } = useAuth()
  const allowed = canViewAnalytics(user?.email)

  if (!allowed) {
    return (
      <PageStatus
        variant="forbidden"
        aria-label="Access denied"
        description="Analytics is available to a limited set of users. Contact an administrator if you need access."
        action={<PageStatusLink to="/" label="Back to home" />}
      />
    )
  }

  return children
}

export function RequireReviewOversight({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const allowed = canViewAllReviews(user?.permissions)

  if (!allowed) {
    return (
      <PageStatus
        variant="forbidden"
        aria-label="Access denied"
        description="Calibration is available to people with All read access or All read + write access."
        action={<PageStatusLink to="/" label="Back to home" />}
      />
    )
  }

  return children
}
