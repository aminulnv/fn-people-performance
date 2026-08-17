import type { ReactNode } from 'react'
import {
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'

type RequirePlatformWriteProps = {
  children: ReactNode
}

export function RequirePlatformWrite({ children }: RequirePlatformWriteProps) {
  const { user } = useAuth()
  const canWrite = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )

  if (!canWrite) {
    return (
      <PageStatus
        variant="forbidden"
        aria-label="Access denied"
        description="You do not have permission to manage performance cycles. Contact an administrator if you need access."
        action={<PageStatusLink to="/" label="Back to home" />}
      />
    )
  }

  return children
}
