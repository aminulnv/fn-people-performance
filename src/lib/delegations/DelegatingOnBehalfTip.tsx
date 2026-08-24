import type { ReactNode } from 'react'
import { Avatar, Tooltip } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'

export function delegatingFromActivityMetadata(
  metadata: Record<string, unknown> | undefined,
): { name: string; avatarUrl?: string } | null {
  const name =
    typeof metadata?.delegatingForName === 'string'
      ? metadata.delegatingForName.trim()
      : typeof metadata?.coveringForName === 'string'
        ? metadata.coveringForName.trim()
        : ''
  if (!name) return null
  const avatarUrl =
    typeof metadata?.delegatingForAvatarUrl === 'string'
      ? metadata.delegatingForAvatarUrl.trim()
      : typeof metadata?.coveringForAvatarUrl === 'string'
        ? metadata.coveringForAvatarUrl.trim()
        : ''
  return { name, avatarUrl: avatarUrl || undefined }
}

export function DelegatingOnBehalfHover({
  name,
  avatarUrl,
  children,
}: {
  name?: string
  avatarUrl?: string
  children: ReactNode
}) {
  const managerName = name?.trim() ?? ''
  if (!managerName) return children
  return (
    <Tooltip
      side="top"
      portal
      delayMs={80}
      content={
        <span className="pd-covering-tip">
          <span>Delegating on behalf of</span>
          <Avatar
            name={managerName}
            src={avatarUrl}
            size="sm"
            alt={managerName}
            style={avatarStyle(managerName)}
          />
          <span>{managerName}</span>
        </span>
      }
    >
      {children}
    </Tooltip>
  )
}
