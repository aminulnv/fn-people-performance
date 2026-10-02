import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, UserRoundSearch, Undo2 } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import { useFloatingPanel } from '@/components/ui/useFloatingPanel'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { avatarHue, usableAvatarUrl } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import { useAuth } from '@/lib/useAuth'
import { nameInitials } from './utils'
import { useHoverMenu } from './useHoverMenu'

function employeeMatchesQuery(
  name: string,
  email: string,
  title: string,
  query: string,
): boolean {
  if (!query) return true
  const haystack = `${name} ${email} ${title}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => haystack.includes(part))
}

export function TopBarImpersonation({ isMobile }: { isMobile?: boolean }) {
  const navigate = useNavigate()
  const { user, actor, isImpersonating, startImpersonation, stopImpersonation } =
    useAuth()
  const { employees } = useEmployees({ load: false })
  const panelRef = useRef<HTMLDivElement>(null)
  const { open, setOpen, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
    panelRef,
  })
  const panelStyle = useFloatingPanel({
    open,
    anchorRef: containerRef,
    panelRef,
    preferredAlign: 'end',
  })
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<number | 'stop' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSwitch = hasSystemPermission(actor?.permissions, 'platform.write_all')

  const options = useMemo(() => {
    const active = employees
      .filter((employee) => employee.isActive)
      .map((employee) => ({
        employeeId: employee.employeeId,
        name: employee.fullName,
        email: employee.email,
        title: employee.jobTitle || employee.role || '',
        avatarUrl: usableAvatarUrl(employee.avatarUrl),
        avatarHue: avatarHue(employee.email || String(employee.employeeId)),
        initials: nameInitials(employee.fullName),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const filtered = active.filter((row) =>
      employeeMatchesQuery(row.name, row.email, row.title, query),
    )
    return filtered.slice(0, 80)
  }, [employees, query])

  if (!canSwitch) return null

  const currentEmployeeId = user?.employeeId ?? Number(user?.personId)
  const viewingLabel = isImpersonating
    ? `Viewing as ${user?.name ?? 'user'}`
    : 'View as user'

  const runSwitch = async (employeeId: number) => {
    setError(null)
    setBusyId(employeeId)
    try {
      await startImpersonation(employeeId)
      setOpen(false)
      setQuery('')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch profile.')
    } finally {
      setBusyId(null)
    }
  }

  const runStop = async () => {
    setError(null)
    setBusyId('stop')
    try {
      await stopImpersonation()
      setOpen(false)
      setQuery('')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop viewing.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      ref={containerRef}
      className="pd-topbar__impersonate"
      {...hoverHandlers}
    >
      <Tooltip content={viewingLabel} side="bottom" portal>
        <button
          type="button"
          className={
            isImpersonating
              ? 'pd-topbar__icon-btn pd-topbar__impersonate-btn is-active'
              : 'pd-topbar__icon-btn pd-topbar__impersonate-btn'
          }
          onClick={toggle}
          aria-label={viewingLabel}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <UserRoundSearch size={16} strokeWidth={2} aria-hidden />
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--impersonate"
            role="menu"
            aria-label="View as user"
            style={{
              ...panelStyle,
              visibility: panelStyle ? 'visible' : 'hidden',
            }}
            {...hoverHandlers}
          >
            <div className="pd-topbar__dropdown-header">
              <div className="pd-topbar__dropdown-header-text">
                <div className="pd-topbar__dropdown-title">View as user</div>
                <div className="pd-topbar__dropdown-subtitle">
                  {isImpersonating
                    ? `Currently ${user?.name ?? 'another user'}`
                    : 'See the platform exactly as they do'}
                </div>
              </div>
            </div>

            <label className="pd-topbar__impersonate-search">
              <Search size={14} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people…"
                autoFocus={!isMobile}
              />
            </label>

            {error ? (
              <p className="pd-topbar__impersonate-error" role="alert">
                {error}
              </p>
            ) : null}

            {isImpersonating ? (
              <button
                type="button"
                className="pd-topbar__dropdown-item"
                role="menuitem"
                disabled={busyId != null}
                onClick={() => void runStop()}
              >
                <Undo2 size={14} strokeWidth={2} aria-hidden />
                Back to {actor?.name ?? 'my account'}
              </button>
            ) : null}

            <div className="pd-topbar__act-as" role="group" aria-label="People">
              {options.length === 0 ? (
                <p className="pd-topbar__impersonate-empty">No people found.</p>
              ) : (
                options.map((row) => {
                  const isCurrent =
                    Number.isFinite(currentEmployeeId) &&
                    row.employeeId === currentEmployeeId
                  return (
                    <button
                      key={row.employeeId}
                      type="button"
                      className={
                        isCurrent
                          ? 'pd-topbar__dropdown-item pd-topbar__act-as-item is-active'
                          : 'pd-topbar__dropdown-item pd-topbar__act-as-item'
                      }
                      role="menuitem"
                      disabled={busyId != null || isCurrent}
                      onClick={() => void runSwitch(row.employeeId)}
                    >
                      <span
                        className="pd-topbar__act-as-avatar"
                        style={
                          row.avatarUrl
                            ? undefined
                            : { background: `hsl(${row.avatarHue} 55% 42%)` }
                        }
                      >
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt="" />
                        ) : (
                          row.initials
                        )}
                      </span>
                      <span className="pd-topbar__act-as-text">
                        <span className="pd-topbar__act-as-name">{row.name}</span>
                        <span className="pd-topbar__act-as-meta">
                          {row.title || row.email}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
