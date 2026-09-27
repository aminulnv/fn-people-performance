import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, FlaskConical, Pencil } from 'lucide-react'
import {
  Accordion,
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Switch,
  Textarea,
} from '@/components/ui'
import { ApiError } from '@/lib/apiClient'
import { hasSystemPermission } from '@/lib/accessControl/types'
import {
  getBrowserNotificationPermission,
  likelyMissingOsBanners,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermission,
} from '@/lib/notifications/browserNotifications'
import {
  fetchNotificationRules,
  resetNotificationRule,
  sendTestNotificationRule,
  updateNotificationRule,
} from '@/lib/notifications/rulesApi'
import { setNotificationRulesCache } from '@/lib/notifications/rulesCache'
import {
  groupNotificationRules,
  NOTIFICATION_RULE_CATEGORY_SECTIONS,
  type NotificationRuleGroup,
} from '@/lib/notifications/ruleGroups'
import {
  ruleSummary,
  type NotificationRule,
  type NotificationRuleCategory,
} from '@/lib/notifications/ruleTypes'
import type { NotificationChannel } from '@/lib/notifications/types'
import { useAuth } from '@/lib/useAuth'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-settings.css'

type CategoryFilter = 'all' | NotificationRuleCategory

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'goals', label: 'Goals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'organisation', label: 'Organisation' },
  { id: 'access', label: 'Access' },
]

const PREVIEW_VARIABLES: Record<string, string> = {
  cycle: 'H2 2026',
  deadline: '15 Oct',
  days: '5',
  employee: 'Sara Khan',
  manager: 'Alex Rivera',
  count: '3',
  reason: 'Please tighten the success metric',
  approver: 'Alex Rivera',
  skipLevelManager: 'Jordan Lee',
  actor: 'Alex Rivera',
  comment: 'Can you take a look at this?',
  goal: 'Improve onboarding completion',
  reviewType: 'Manager review',
  scope: 'Engineering',
  date: '1 Nov',
  administrator: 'Aminul Islam',
  stage: 'Self-review',
  oldDate: '1 Oct',
  newDate: '8 Oct',
  newManager: 'Alex Rivera',
  accessProfile: 'Read + write',
  message: 'Please submit your goals this week',
  thresholdDate: '1 Sep',
  grade: 'Exceeds',
}

function renderPreview(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key]
    return value == null || value === '' ? '…' : value
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = (error.body as { error?: unknown }).error
    if (typeof message === 'string') return message
  }
  return error instanceof Error ? error.message : 'Could not update notification rule.'
}

function channelLabel(channel: NotificationChannel): string {
  if (channel === 'in_app') return 'In-app'
  if (channel === 'email') return 'Email'
  if (channel === 'browser') return 'Browser'
  return 'ClickUp'
}

function countLabel(rules: NotificationRule[]): string {
  const onCount = rules.filter((rule) => rule.enabled).length
  return `${rules.length} · ${onCount} on`
}

function SectionTitle({
  icon: Icon,
  label,
  meta,
}: {
  icon: NotificationRuleGroup['icon']
  label: string
  meta: string
}) {
  return (
    <span className="pd-notify-rules__section-title">
      <span className="pd-notify-rules__section-icon" aria-hidden>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <span className="pd-notify-rules__section-label">
        <strong>{label}</strong>
        <span className="pd-notify-rules__section-meta">{meta}</span>
      </span>
    </span>
  )
}

function RuleRows({
  rules,
  canWrite,
  savingKey,
  testingKey,
  onToggle,
  onEdit,
  onTest,
}: {
  rules: NotificationRule[]
  canWrite: boolean
  savingKey: string | null
  testingKey: string | null
  onToggle: (rule: NotificationRule, enabled: boolean) => void
  onEdit: (rule: NotificationRule) => void
  onTest: (rule: NotificationRule) => void
}) {
  return (
    <div className="pd-notify-rules__list" role="list">
      {rules.map((rule) => {
        const busy = savingKey === rule.eventKey || testingKey === rule.eventKey
        return (
          <div
            key={rule.eventKey}
            className="pd-notify-rules__row"
            role="listitem"
          >
            <div className="pd-notify-rules__copy">
              <strong className="pd-notify-rules__row-name">{rule.name}</strong>
              <span className="pd-notify-rules__summary">
                {ruleSummary(rule)}
              </span>
            </div>
            <div className="pd-notify-rules__actions">
              <Switch
                label={rule.enabled ? 'On' : 'Off'}
                checked={rule.enabled}
                disabled={!canWrite || busy}
                onChange={(event) => onToggle(rule, event.target.checked)}
              />
              {canWrite ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={testingKey === rule.eventKey}
                  disabled={busy}
                  onClick={() => onTest(rule)}
                >
                  <FlaskConical size={14} strokeWidth={2.25} aria-hidden />
                  Test
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => onEdit(rule)}
              >
                <Pencil size={14} strokeWidth={2.25} aria-hidden />
                {canWrite ? 'Edit' : 'View'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NestedGroups({
  groups,
  canWrite,
  savingKey,
  testingKey,
  onToggle,
  onEdit,
  onTest,
}: {
  groups: { group: NotificationRuleGroup; rules: NotificationRule[] }[]
  canWrite: boolean
  savingKey: string | null
  testingKey: string | null
  onToggle: (rule: NotificationRule, enabled: boolean) => void
  onEdit: (rule: NotificationRule) => void
  onTest: (rule: NotificationRule) => void
}) {
  return (
    <div className="pd-notify-rules__nested">
      {groups.map(({ group, rules }) => {
        const GroupIcon = group.icon
        return (
          <section
            key={group.id}
            className="pd-notify-rules__group"
            aria-label={group.label}
          >
            <header className="pd-notify-rules__group-head">
              <span className="pd-notify-rules__group-icon" aria-hidden>
                <GroupIcon size={15} strokeWidth={2.25} />
              </span>
              <div className="pd-notify-rules__group-title">
                <h3>{group.label}</h3>
                <span className="pd-notify-rules__section-meta">
                  {countLabel(rules)}
                </span>
              </div>
            </header>
            <RuleRows
              rules={rules}
              canWrite={canWrite}
              savingKey={savingKey}
              testingKey={testingKey}
              onToggle={onToggle}
              onEdit={onEdit}
              onTest={onTest}
            />
          </section>
        )
      })}
    </div>
  )
}

export function NotificationRulesPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<ReviewSaveNotice | null>(null)
  const [editing, setEditing] = useState<NotificationRule | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftChannels, setDraftChannels] = useState<NotificationChannel[]>([
    'in_app',
  ])
  const [browserPermission, setBrowserPermission] =
    useState<BrowserNotificationPermission>(() =>
      getBrowserNotificationPermission(),
    )
  const [requestingBrowser, setRequestingBrowser] = useState(false)

  const loadRules = useCallback(() => {
    return fetchNotificationRules()
      .then((next) => {
        setRules(next)
        setNotificationRulesCache(next)
        setError(null)
      })
      .catch((nextError) => {
        setError(errorMessage(nextError))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  // One-shot: /settings?browserNotification=1#notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oneShot =
      params.get('browserNotification') === '1' ||
      params.get('browserToast') === '1'
    if (!oneShot) return
    params.delete('browserNotification')
    params.delete('browserToast')
    const nextSearch = params.toString()
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ''
    }${window.location.hash}`
    window.history.replaceState({}, '', nextUrl)
    setRequestingBrowser(true)
    void (async () => {
      const permission = await requestBrowserNotificationPermission()
      setBrowserPermission(permission)
      const shown = await showBrowserNotification({
        id: `preview-${Date.now()}`,
        title: 'Test · Browser notification',
        body: 'If you see this in the corner, browser notifications are working. Click to open Settings.',
        destination: '/settings#notifications',
        force: true,
      })
      setNotice(
        successNotice(
          shown
            ? 'Browser notification sent.'
            : 'Could not show a browser notification.',
        ),
      )
      setRequestingBrowser(false)
    })()
  }, [])

  const refresh = useCallback(() => {
    void loadRules()
  }, [loadRules])
  useLiveTopic('notification-rules', refresh)

  const grouped = useMemo(() => {
    const sections = groupNotificationRules(rules)
    if (category === 'all') return sections
    return sections.filter((section) => section.categoryId === category)
  }, [category, rules])

  const categoryMeta = useMemo(
    () => new Map(NOTIFICATION_RULE_CATEGORY_SECTIONS.map((item) => [item.id, item])),
    [],
  )

  const openEditor = useCallback((rule: NotificationRule) => {
    setEditing(rule)
    setDraftTitle(rule.titleTemplate)
    setDraftBody(rule.bodyTemplate)
    setDraftChannels([...rule.channels])
  }, [])

  const sendTest = useCallback(
    async (rule: NotificationRule) => {
      if (!canWrite) return
      const recipientId =
        user?.employeeId != null
          ? String(user.employeeId)
          : user?.personId ?? user?.id
      if (!recipientId) {
        setError(
          'Your account must be linked to an employee to receive a test notification.',
        )
        return
      }
      setTestingKey(rule.eventKey)
      setError(null)
      try {
        await sendTestNotificationRule(rule.eventKey, recipientId)
        void queryClient.invalidateQueries({ queryKey: ['notifications'] })
        setNotice(successNotice('Test sent.'))
      } catch (nextError) {
        setError(errorMessage(nextError))
      } finally {
        setTestingKey(null)
      }
    },
    [canWrite, queryClient, user?.employeeId, user?.id, user?.personId],
  )

  const toggleEnabled = useCallback(
    async (rule: NotificationRule, enabled: boolean) => {
      if (!canWrite) return
      setSavingKey(rule.eventKey)
      setError(null)
      try {
        const next = await updateNotificationRule(rule.eventKey, { enabled })
        setRules((current) => {
          const updated = current.map((item) =>
            item.eventKey === next.eventKey ? next : item,
          )
          setNotificationRulesCache(updated)
          return updated
        })
        setNotice(
          successNotice(
            enabled ? 'Notification turned on.' : 'Notification turned off.',
          ),
        )
      } catch (nextError) {
        setError(errorMessage(nextError))
      } finally {
        setSavingKey(null)
      }
    },
    [canWrite],
  )

  const saveEditor = async () => {
    if (!editing || !canWrite) return
    setSavingKey(editing.eventKey)
    setError(null)
    try {
      const next = await updateNotificationRule(editing.eventKey, {
        titleTemplate: draftTitle,
        bodyTemplate: draftBody,
        channels: draftChannels,
      })
      setRules((current) => {
        const updated = current.map((item) =>
          item.eventKey === next.eventKey ? next : item,
        )
        setNotificationRulesCache(updated)
        return updated
      })
      setEditing(null)
      setNotice(successNotice('Notification rule saved.'))
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setSavingKey(null)
    }
  }

  const resetEditor = async () => {
    if (!editing || !canWrite) return
    setSavingKey(editing.eventKey)
    setError(null)
    try {
      const next = await resetNotificationRule(editing.eventKey)
      setRules((current) => {
        const updated = current.map((item) =>
          item.eventKey === next.eventKey ? next : item,
        )
        setNotificationRulesCache(updated)
        return updated
      })
      setDraftTitle(next.titleTemplate)
      setDraftBody(next.bodyTemplate)
      setDraftChannels([...next.channels])
      setNotice(successNotice('Reset to default wording and channels.'))
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setSavingKey(null)
    }
  }

  const toggleChannel = (channel: NotificationChannel, checked: boolean) => {
    setDraftChannels((current) => {
      if (checked) {
        return current.includes(channel) ? current : [...current, channel]
      }
      const next = current.filter((item) => item !== channel)
      return next.length > 0 ? next : current
    })
  }

  const accordionItems =
    category === 'all'
      ? grouped.map((section) => {
          const meta = categoryMeta.get(section.categoryId)
          const Icon = meta?.icon ?? Bell
          return {
            id: section.categoryId,
            title: (
              <SectionTitle
                icon={Icon}
                label={meta?.label ?? section.categoryId}
                meta={countLabel(section.rules)}
              />
            ),
            content: (
              <NestedGroups
                groups={section.groups}
                canWrite={canWrite}
                savingKey={savingKey}
                testingKey={testingKey}
                onToggle={(rule, enabled) => void toggleEnabled(rule, enabled)}
                onEdit={openEditor}
                onTest={(rule) => void sendTest(rule)}
              />
            ),
          }
        })
      : (grouped[0]?.groups ?? []).map(({ group, rules: groupRules }) => ({
          id: group.id,
          title: (
            <SectionTitle
              icon={group.icon}
              label={group.label}
              meta={countLabel(groupRules)}
            />
          ),
          content: (
            <RuleRows
              rules={groupRules}
              canWrite={canWrite}
              savingKey={savingKey}
              testingKey={testingKey}
              onToggle={(rule, enabled) => void toggleEnabled(rule, enabled)}
              onEdit={openEditor}
              onTest={(rule) => void sendTest(rule)}
            />
          ),
        }))

  const defaultOpenIds =
    category === 'all'
      ? accordionItems[0]
        ? [accordionItems[0].id]
        : []
      : accordionItems.map((item) => item.id)

  return (
    <section
      className="pd-settings-section pd-notify-rules"
      aria-labelledby="notify-rules-heading"
    >
      <ReviewSaveBanner
        notice={notice}
        onDismiss={() => setNotice(null)}
      />
      <div className="pd-settings-section__header pd-notify-rules__header">
        <div className="pd-notify-rules__heading">
          <span className="pd-notify-rules__heading-icon" aria-hidden>
            <Bell size={17} strokeWidth={2.25} />
          </span>
          <div>
            <h2 id="notify-rules-heading" className="pd-settings-section__title">
              Notification rules
            </h2>
          </div>
        </div>
        <div className="pd-notify-rules__header-actions">
          {browserPermission === 'default' ||
          browserPermission === 'unsupported' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={
                browserPermission === 'unsupported' || requestingBrowser
              }
              loading={requestingBrowser}
              onClick={() => {
                setRequestingBrowser(true)
                void requestBrowserNotificationPermission()
                  .then((next) => setBrowserPermission(next))
                  .finally(() => setRequestingBrowser(false))
              }}
            >
              Allow browser notifications
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={requestingBrowser}
              title={
                likelyMissingOsBanners()
                  ? 'Use your usual browser for corner banners.'
                  : undefined
              }
              onClick={() => {
                setRequestingBrowser(true)
                void showBrowserNotification({
                  id: `preview-${Date.now()}`,
                  title: 'Test · Browser notification',
                  body: 'Browser notifications are working.',
                  destination: '/settings#notifications',
                  force: true,
                })
                  .then((shown) => {
                    setNotice(
                      successNotice(
                        shown
                          ? 'Browser notification sent.'
                          : 'Could not show a browser notification.',
                      ),
                    )
                  })
                  .finally(() => setRequestingBrowser(false))
              }}
            >
              Send browser notification
            </Button>
          )}
        </div>
      </div>

      {!canWrite ? (
        <p className="pd-notify-rules__notice">Read-only — you can’t change rules.</p>
      ) : null}

      <SegmentedControl
        className="pd-notify-rules__tabs"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
        aria-label="Notification rule category"
      />

      {error ? (
        <p className="pd-notify-rules__error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="pd-notify-rules__empty">Loading rules…</p>
      ) : accordionItems.length === 0 ? (
        <p className="pd-notify-rules__empty">No rules in this category.</p>
      ) : (
        <Accordion
          key={category}
          className="pd-notify-rules__accordion"
          multiple
          defaultOpenIds={defaultOpenIds}
          items={accordionItems}
        />
      )}

      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing?.name ?? 'Notification rule'}
        actions={
          <>
            {canWrite ? (
              <Button
                type="button"
                variant="secondary"
                disabled={savingKey === editing?.eventKey}
                onClick={() => void resetEditor()}
              >
                Reset defaults
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              {canWrite ? 'Cancel' : 'Close'}
            </Button>
            {canWrite ? (
              <Button
                type="button"
                loading={savingKey === editing?.eventKey}
                disabled={draftChannels.length === 0}
                onClick={() => void saveEditor()}
              >
                Save
              </Button>
            ) : null}
          </>
        }
      >
        {editing ? (
          <div className="pd-notify-rules__editor">
            <Field label="Channels">
              <div className="pd-notify-rules__channels">
                {(['in_app', 'browser', 'email'] as const).map((channel) => (
                  <Checkbox
                    key={channel}
                    label={channelLabel(channel)}
                    checked={draftChannels.includes(channel)}
                    disabled={!canWrite}
                    onChange={(event) =>
                      toggleChannel(channel, event.target.checked)
                    }
                  />
                ))}
              </div>
            </Field>
            <Field label="Title">
              <Input
                value={draftTitle}
                disabled={!canWrite}
                onChange={(event) => setDraftTitle(event.target.value)}
                aria-label="Notification title"
              />
            </Field>
            <Field label="Body">
              <Textarea
                value={draftBody}
                disabled={!canWrite}
                onChange={(event) => setDraftBody(event.target.value)}
                rows={3}
                aria-label="Notification body"
              />
            </Field>
            <div className="pd-notify-rules__preview" aria-live="polite">
              <span className="pd-notify-rules__preview-label">Preview</span>
              <strong>{renderPreview(draftTitle, PREVIEW_VARIABLES)}</strong>
              <span>{renderPreview(draftBody, PREVIEW_VARIABLES)}</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
