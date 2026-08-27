import type { ReactNode } from 'react'
import {
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import {
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
  return (
    <RequirePermission
      permission="platform.read_all"
      description="Analytics is available to administrators. Contact an administrator if you need access."
    >
      {children}
    </RequirePermission>
  )
}
