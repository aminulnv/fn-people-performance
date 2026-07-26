/**
 * Components — live demos of reusable UI primitives.
 * Import from `@/components/ui`. Use theme tokens; do not hardcode brand hexes.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Inbox, MoreHorizontal, Plus, Settings, Trash2 } from 'lucide-react'
import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Divider,
  DropdownMenu,
  EmptyState,
  Field,
  Input,
  LoadMore,
  MetricTile,
  Modal,
  PageHeader,
  Pagination,
  Progress,
  RadioGroup,
  SearchField,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  Tooltip,
  type AlertVariant,
} from '@/components/ui'
import '@/styles/layout-components.css'

type LibrarySection = {
  id: string
  title: string
  demo: ReactNode
}

type AlertSample = {
  variant: AlertVariant
  title: string
  body: string
}

type ToastItem = AlertSample & { id: string }

const ALERT_SAMPLES: AlertSample[] = [
  {
    variant: 'info',
    title: 'Naomi Kishida',
    body: 'Great, thanks a lot for the quick reply!',
  },
  {
    variant: 'success',
    title: 'Changes saved',
    body: 'The contract start date was changed',
  },
  {
    variant: 'warning',
    title: 'Missing goals',
    body: 'Three people have no goals for this cycle.',
  },
  {
    variant: 'error',
    title: 'Document deleted',
    body: 'The document was successfully deleted',
  },
]

const TOAST_DURATION_MS = 4500

function Section({ section }: { section: LibrarySection }) {
  return (
    <section
      id={section.id}
      className="pd-library-section"
      aria-labelledby={`${section.id}-title`}
    >
      <h2 id={`${section.id}-title`} className="pd-library-section__title">
        {section.title}
      </h2>
      {section.demo}
    </section>
  )
}

export default function ComponentsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('Ada')
  const [page, setPage] = useState(2)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const cancelRef = useRef<HTMLButtonElement>(null)
  const toastTimers = useRef(new Map<string, number>())

  const dismissToast = (id: string) => {
    const timer = toastTimers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      toastTimers.current.delete(id)
    }
    setToasts((items) => items.filter((item) => item.id !== id))
  }

  const showToast = (sample: AlertSample) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`

    setToasts((items) => [...items, { id, ...sample }])
    const timer = window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    toastTimers.current.set(id, timer)
  }

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer))
      toastTimers.current.clear()
    },
    [],
  )

  const handleLoadingDemo = () => {
    setLoading(true)
    window.setTimeout(() => setLoading(false), 1200)
  }

  const sections: LibrarySection[] = [
    {
      id: 'button',
      title: 'Button',
      demo: (
        <div className="pd-library-demo pd-library-demo--row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button loading={loading} onClick={handleLoadingDemo}>
            {loading ? 'Saving…' : 'Loading'}
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      ),
    },
    {
      id: 'input',
      title: 'Input',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack pd-library-demo--narrow">
          <Input
            label="Full name"
            placeholder="Jane Doe"
            hint="As it appears on records."
          />
          <Input
            label="Work email"
            type="email"
            error="Enter a valid email address."
            defaultValue="jane@"
          />
          <Input label="Disabled" disabled defaultValue="Read only" />
        </div>
      ),
    },
    {
      id: 'textarea',
      title: 'Textarea',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack pd-library-demo--narrow">
          <Textarea
            label="Notes"
            placeholder="Add context for reviewers…"
            hint="Visible to managers only."
          />
          <Textarea
            label="Summary"
            error="Summary is required."
            defaultValue=""
          />
        </div>
      ),
    },
    {
      id: 'select',
      title: 'Select',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack pd-library-demo--narrow">
          <Select
            label="Department"
            placeholder="Choose a department"
            defaultValue=""
            options={[
              { value: 'eng', label: 'Engineering' },
              { value: 'design', label: 'Design' },
              { value: 'people', label: 'People' },
            ]}
          />
          <Select
            label="Cycle"
            error="Select a review cycle."
            defaultValue=""
            options={[
              { value: 'q1', label: 'Q1 2026' },
              { value: 'q2', label: 'Q2 2026' },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'checkbox-switch',
      title: 'Checkbox & Switch',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <Checkbox label="Include direct reports" defaultChecked />
          <Checkbox label="Send weekly digest" />
          <Switch label="Enable notifications" defaultChecked />
          <Switch label="Compact table density" />
        </div>
      ),
    },
    {
      id: 'badge',
      title: 'Badge',
      demo: (
        <div className="pd-library-demo pd-library-demo--row">
          <Badge>Neutral</Badge>
          <Badge variant="completed">Completed</Badge>
          <Badge variant="pending">Pending</Badge>
          <Badge variant="in-progress">In progress</Badge>
          <Badge variant="on-hold">On hold</Badge>
          <Badge variant="danger">Overdue</Badge>
        </div>
      ),
    },
    {
      id: 'avatar',
      title: 'Avatar',
      demo: (
        <div className="pd-library-demo pd-library-demo--row">
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Demo User" size="md" />
          <Avatar name="Grace Hopper" size="lg" />
          <Avatar name="Solo" />
        </div>
      ),
    },
    {
      id: 'modal',
      title: 'Modal',
      demo: (
        <div className="pd-library-demo">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Archive goal?"
            description="Archived goals are hidden from active lists. You can restore them later from archives."
            initialFocusRef={cancelRef}
            actions={
              <>
                <Button
                  ref={cancelRef}
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => setModalOpen(false)}>
                  Archive
                </Button>
              </>
            }
          />
        </div>
      ),
    },
    {
      id: 'alert',
      title: 'Alert',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          {ALERT_SAMPLES.map((sample) => (
            <div
              key={sample.variant}
              className="pd-library-alert-trigger"
              role="button"
              tabIndex={0}
              aria-label={`Preview ${sample.variant} alert on screen`}
              onClick={() => showToast(sample)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  showToast(sample)
                }
              }}
            >
              <Alert variant={sample.variant} title={sample.title}>
                {sample.body}
              </Alert>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'page-header',
      title: 'Page header',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <PageHeader
            title="Team goals"
            description="Track progress across the current review cycle."
            actions={
              <>
                <Button variant="secondary">Export</Button>
                <Button>
                  <Plus size={16} strokeWidth={2.25} aria-hidden />
                  New goal
                </Button>
              </>
            }
          />
        </div>
      ),
    },
    {
      id: 'empty-state',
      title: 'Empty state',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <EmptyState
            icon={Inbox}
            title="No goals yet"
            description="Create the first goal for this team to start tracking progress."
            action={<Button>Create goal</Button>}
          />
        </div>
      ),
    },
    {
      id: 'table',
      title: 'Table',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Ada Lovelace</TableCell>
                <TableCell>Engineer</TableCell>
                <TableCell>
                  <Badge variant="completed">Completed</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Grace Hopper</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>
                  <Badge variant="in-progress">In progress</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Alan Turing</TableCell>
                <TableCell>Analyst</TableCell>
                <TableCell>
                  <Badge variant="pending">Pending</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      id: 'tabs',
      title: 'Tabs',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <Tabs
            items={[
              {
                id: 'overview',
                label: 'Overview',
                content: <p className="pd-library-panel">Overview panel</p>,
              },
              {
                id: 'activity',
                label: 'Activity',
                content: <p className="pd-library-panel">Activity panel</p>,
              },
              {
                id: 'files',
                label: 'Files',
                content: <p className="pd-library-panel">Files panel</p>,
              },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'metric-tile',
      title: 'Metric tile',
      demo: (
        <div className="pd-library-demo pd-library-demo--metrics">
          <MetricTile label="Active goals" value={128} hint="+12 this week" />
          <MetricTile label="Completion" value="74%" hint="Cycle average" />
          <MetricTile label="At risk" value={9} />
        </div>
      ),
    },
    {
      id: 'tooltip',
      title: 'Tooltip',
      demo: (
        <div className="pd-library-demo pd-library-demo--row">
          <Tooltip content="Edit this goal">
            <Button variant="secondary" size="sm">
              Hover me
            </Button>
          </Tooltip>
          <Tooltip content="More actions" side="bottom">
            <Button variant="ghost" size="sm" aria-label="More">
              <MoreHorizontal size={16} strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip>
        </div>
      ),
    },
    {
      id: 'skeleton',
      title: 'Skeleton',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack pd-library-demo--narrow">
          <div className="pd-library-demo pd-library-demo--row">
            <Skeleton variant="avatar" />
            <div style={{ flex: 1, display: 'grid', gap: '0.5rem' }}>
              <Skeleton variant="title" />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="70%" />
            </div>
          </div>
          <Skeleton variant="rect" height="4.5rem" />
          <Skeleton variant="button" />
        </div>
      ),
    },
    {
      id: 'confirm-dialog',
      title: 'Confirm dialog',
      demo: (
        <div className="pd-library-demo">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Delete goal
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => setConfirmOpen(false)}
            title="Delete goal?"
            description="This removes the goal for everyone on the team. This can’t be undone."
            confirmLabel="Delete"
            confirmVariant="danger"
          />
        </div>
      ),
    },
    {
      id: 'search-field',
      title: 'Search field',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack pd-library-demo--narrow">
          <SearchField
            placeholder="Search people…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
          <SearchField placeholder="Disabled search" disabled />
        </div>
      ),
    },
    {
      id: 'dropdown-menu',
      title: 'Dropdown menu',
      demo: (
        <div className="pd-library-demo pd-library-demo--row">
          <DropdownMenu
            label="Actions"
            align="start"
            items={[
              {
                id: 'settings',
                label: 'Settings',
                icon: <Settings size={14} strokeWidth={2} aria-hidden />,
                onSelect: () => undefined,
              },
              {
                id: 'delete',
                label: 'Delete',
                danger: true,
                icon: <Trash2 size={14} strokeWidth={2} aria-hidden />,
                onSelect: () => undefined,
              },
            ]}
          />
          <DropdownMenu
            label="More"
            align="end"
            trigger={
              <>
                <MoreHorizontal size={16} strokeWidth={2.25} aria-hidden />
                More
              </>
            }
            items={[
              { id: 'edit', label: 'Edit', onSelect: () => undefined },
              { id: 'duplicate', label: 'Duplicate', onSelect: () => undefined },
              {
                id: 'archive',
                label: 'Archive',
                disabled: true,
                onSelect: () => undefined,
              },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'pagination',
      title: 'Pagination',
      demo: (
        <div className="pd-library-demo">
          <Pagination page={page} pageCount={12} onPageChange={setPage} />
        </div>
      ),
    },
    {
      id: 'load-more',
      title: 'Load more',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <LoadMore
            loading={loadMoreLoading}
            hasMore={hasMore}
            onClick={() => {
              setLoadMoreLoading(true)
              window.setTimeout(() => {
                setLoadMoreLoading(false)
                setHasMore(false)
              }, 900)
            }}
          />
          {!hasMore ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHasMore(true)}
            >
              Reset demo
            </Button>
          ) : null}
        </div>
      ),
    },
    {
      id: 'divider',
      title: 'Divider',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack" style={{ width: '100%' }}>
          <Divider />
          <Divider label="Or continue with" />
        </div>
      ),
    },
    {
      id: 'radio',
      title: 'Radio',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack">
          <RadioGroup
            legend="Review visibility"
            name="visibility"
            defaultValue="team"
            options={[
              { value: 'private', label: 'Private' },
              { value: 'team', label: 'Team' },
              { value: 'org', label: 'Organization' },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'field',
      title: 'Field',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack pd-library-demo--narrow">
          <Field label="Channels" hint="Choose where updates are sent.">
            <div className="pd-library-demo pd-library-demo--stack">
              <Checkbox label="Email" defaultChecked />
              <Checkbox label="Slack" />
            </div>
          </Field>
          <Field label="Priority" error="Pick at least one option.">
            <div className="pd-library-demo pd-library-demo--stack">
              <Checkbox label="High" />
              <Checkbox label="Medium" />
            </div>
          </Field>
        </div>
      ),
    },
    {
      id: 'card',
      title: 'Card',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack" style={{ maxWidth: '24rem' }}>
          <Card
            title="Q2 goals"
            description="Track completion across engineering."
            actions={<Button size="sm">Open</Button>}
          >
            <Progress label="Overall" value={68} showValue />
          </Card>
        </div>
      ),
    },
    {
      id: 'spinner',
      title: 'Spinner',
      demo: (
        <div className="pd-library-demo pd-library-demo--row">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      ),
    },
    {
      id: 'progress',
      title: 'Progress',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack" style={{ width: '100%', maxWidth: '22rem' }}>
          <Progress label="Onboarding" value={42} showValue />
          <Progress label="Reviews submitted" value={86} showValue />
        </div>
      ),
    },
    {
      id: 'breadcrumbs',
      title: 'Breadcrumbs',
      demo: (
        <div className="pd-library-demo">
          <Breadcrumbs
            items={[
              { label: 'People', href: '/' },
              { label: 'Engineering', href: '/' },
              { label: 'Ada Lovelace' },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'accordion',
      title: 'Accordion',
      demo: (
        <div className="pd-library-demo pd-library-demo--stack" style={{ width: '100%', maxWidth: '28rem' }}>
          <Accordion
            defaultOpenIds={['goals']}
            items={[
              {
                id: 'goals',
                title: 'Goals',
                content: 'Active goals and cycle targets for this person.',
              },
              {
                id: 'feedback',
                title: 'Feedback',
                content: 'Peer and manager notes from the current cycle.',
              },
              {
                id: 'history',
                title: 'History',
                content: 'Past reviews and archived goals.',
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="pd-page pd-library" aria-label="Components">
      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
      <div
        className="pd-library-toasts"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            className="pd-library-toast"
            variant={toast.variant}
            title={toast.title}
            onClose={() => dismissToast(toast.id)}
          >
            {toast.body}
          </Alert>
        ))}
      </div>
    </div>
  )
}
