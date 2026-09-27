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
  /** Shown when the viewer lacks write access. */
  description?: string
}

export function RequirePlatformWrite({
  children,
  description = 'You do not have permission to make this change. Contact an administrator if you need access.',
}: RequirePlatformWriteProps) {
  return (
    <RequirePermission permission="platform.write_all" description={description}>
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
