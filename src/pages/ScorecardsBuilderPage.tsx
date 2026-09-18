import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ClipboardList, Copy, Plus, Settings2, Trash2 } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageStatus,
  SegmentedControl,
} from '@/components/ui'
import { PURPOSE_SHORT_LABEL } from '@/lib/reviews/purpose'
import {
  ALLOCATED_FORM_POLICY_LOCK,
  countScorecardFormUsage,
} from '@/lib/reviews/scorecardForms'
import {
  createScorecardForm,
  deleteScorecardForm,
  getScorecardForm,
  updateScorecardForm,
} from '@/lib/reviews/scorecardFormsStore'
import { scorecardsBuilderPath } from '@/lib/reviews/paths'
import { defaultReviewPolicy, pillarWeightTotal } from '@/lib/reviews/reviewPolicy'
import {
  applyScorecardTemplate,
  cycleTypeForTemplate,
  SCORECARD_TEMPLATES,
  type ScorecardTemplateId,
} from '@/lib/reviews/scorecardTemplates'
import type { CyclePurpose, ReviewPolicy, ScorecardForm } from '@/lib/reviews/types'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
  useScorecardFormsHydrated,
  useScorecardFormsSnapshot,
} from '@/lib/reviews/useReviews'
import { reviewFormSummary } from '@/pages/reviews/ReviewFormSheet'
import { ScorecardFormEditor } from '@/pages/reviews/ScorecardFormEditor'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

const FORM_TEMPLATE_NAMES: Record<ScorecardTemplateId, string> = {
  blank: 'Untitled form',
  annual: 'Annual appraisal',
  quarterly: 'Q1–Q3 check-in',
  q4: 'Q4 progress',
  leadership: 'Leadership review',
}

const CYCLE_TYPE_ORDER: CyclePurpose[] = [
  'quarterly_checkin',
  'annual_appraisal',
  'custom',
]

const CYCLE_TYPE_OPTIONS = CYCLE_TYPE_ORDER.map((id) => ({
  id,
  label: PURPOSE_SHORT_LABEL[id],
}))

function NewFormMenu({
  creating,
  onPick,
}: {
  creating: boolean
  onPick: (templateId: ScorecardTemplateId) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="pd-reviews-form-canvas__type-menu">
      <Button
        variant="primary"
        pill
        loading={creating}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <Plus size={16} strokeWidth={2} aria-hidden />
        New form
      </Button>
      {open ? (
        <ul
          className="pd-reviews-form-canvas__type-list"
          role="menu"
          aria-label="New form"
        >
          {SCORECARD_TEMPLATES.map((template) => (
            <li key={template.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="pd-reviews-form-canvas__type-item"
                aria-label={template.name}
                onClick={() => {
                  setOpen(false)
                  onPick(template.id)
                }}
              >
                <span className="pd-reviews-form-canvas__type-label" aria-hidden>
                  {template.name}
                </span>
                <span className="pd-reviews-form-canvas__type-hint" aria-hidden>
                  {PURPOSE_SHORT_LABEL[cycleTypeForTemplate(template.id)]} ·{' '}
                  {template.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function FormLibraryRow({
  form,
  usage,
}: {
  form: ScorecardForm
  usage: number
}) {
  return (
    <li>
      <Link
        className="pd-scorecards-builder__row"
        to={scorecardsBuilderPath(form.id)}
      >
        <span className="pd-scorecards-builder__row-main">
          <span className="pd-scorecards-builder__row-title">{form.name}</span>
          <span className="pd-scorecards-builder__row-type">
            {PURPOSE_SHORT_LABEL[form.cycleType]}
          </span>
          <span className="pd-scorecards-builder__row-meta">
            {usage === 0
              ? 'Not allocated'
              : `Used by ${usage} group${usage === 1 ? '' : 's'}`}
          </span>
        </span>
        <span className="pd-scorecards-builder__row-summary">
          {reviewFormSummary(form.policy)}
        </span>
      </Link>
    </li>
  )
}

function ScorecardsBuilderIndex() {
  const navigate = useNavigate()
  const forms = useScorecardFormsSnapshot()
  const formsHydrated = useScorecardFormsHydrated()
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<CyclePurpose | 'all'>('all')

  const rows = useMemo(
    () =>
      forms.map((form) => ({
        form,
        usage: countScorecardFormUsage(form.id, cycles),
      })),
    [cycles, forms],
  )

  const sections = useMemo(() => {
    const visible =
      typeFilter === 'all'
        ? rows
        : rows.filter(({ form }) => form.cycleType === typeFilter)
    return CYCLE_TYPE_ORDER.map((cycleType) => ({
      cycleType,
      label: PURPOSE_SHORT_LABEL[cycleType],
      rows: visible.filter(({ form }) => form.cycleType === cycleType),
    })).filter((section) => section.rows.length > 0)
  }, [rows, typeFilter])

  if (!formsHydrated || !cyclesHydrated) {
    return (
      <PageStatus
        variant="loading"
        pageClassName="pd-reviews"
        aria-label="Loading Scorecards Library"
        description="Loading forms…"
      />
    )
  }

  const createForm = async (templateId: ScorecardTemplateId = 'blank') => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const cycleType = cycleTypeForTemplate(templateId)
      const policy = applyScorecardTemplate(
        defaultReviewPolicy(cycleType),
        templateId,
      )
      const created = await createScorecardForm({
        name: FORM_TEMPLATE_NAMES[templateId] ?? 'Untitled form',
        cycleType,
        policy,
      })
      navigate(scorecardsBuilderPath(created.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create form.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-reviews pd-scorecards-builder"
      aria-label="Scorecards Library"
    >
      <header className="pd-scorecards-builder__hero">
        <div className="pd-scorecards-builder__titles">
          <h1 className="pd-scorecards-builder__title">
            <ClipboardList size={22} strokeWidth={2} aria-hidden />
            Scorecards Library
          </h1>
          <p className="pd-scorecards-builder__lede">
            Build reusable scorecard forms by cycle type, then allocate them to
            matching cycle groups.
          </p>
        </div>
        <div className="pd-scorecards-builder__actions">
          <NewFormMenu creating={creating} onPick={(id) => void createForm(id)} />
        </div>
      </header>
      {rows.length > 0 ? (
        <div className="pd-scorecards-builder__filters">
          <SegmentedControl
            aria-label="Filter by cycle type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { id: 'all', label: 'All' },
              ...CYCLE_TYPE_OPTIONS,
            ]}
          />
        </div>
      ) : null}
      {error ? (
        <p className="pd-reviews-edit__error" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <div className="pd-people__empty-state">
          <EmptyState
            className="pd-people__empty-panel"
            icon={ClipboardList}
            title="No Scorecard Forms Yet"
            description="Create a form document here, then allocate it from a cycle group’s Reviews settings."
            action={
              <NewFormMenu creating={creating} onPick={(id) => void createForm(id)} />
            }
          />
        </div>
      ) : sections.length === 0 ? (
        <div className="pd-people__empty-state">
          <EmptyState
            className="pd-people__empty-panel"
            icon={ClipboardList}
            title="No Forms For This Cycle Type"
            description="Try another filter, or create a form from a matching template."
            action={
              <NewFormMenu creating={creating} onPick={(id) => void createForm(id)} />
            }
          />
        </div>
      ) : (
        <div className="pd-scorecards-builder__sections">
          {sections.map((section) => (
            <section
              key={section.cycleType}
              className="pd-scorecards-builder__section"
              aria-labelledby={`scorecards-${section.cycleType}`}
            >
              <h2
                id={`scorecards-${section.cycleType}`}
                className="pd-scorecards-builder__section-title"
              >
                {section.label}
                <span className="pd-scorecards-builder__section-count">
                  {section.rows.length}
                </span>
              </h2>
              <ul className="pd-scorecards-builder__list">
                {section.rows.map(({ form, usage }) => (
                  <FormLibraryRow key={form.id} form={form} usage={usage} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ScorecardsBuilderEditor({ formId }: { formId: string }) {
  const navigate = useNavigate()
  const forms = useScorecardFormsSnapshot()
  const formsHydrated = useScorecardFormsHydrated()
  const { cycles } = useReviewsSnapshot()
  const form = getScorecardForm(formId) ?? forms.find((item) => item.id === formId)

  const [name, setName] = useState(form?.name ?? '')
  const [cycleType, setCycleType] = useState<CyclePurpose>(
    form?.cycleType ?? 'custom',
  )
  const [policy, setPolicy] = useState<ReviewPolicy | null>(form?.policy ?? null)
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [gradesOpen, setGradesOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<ReviewSaveNotice | null>(null)

  useEffect(() => {
    if (!form) {
      setPolicy(null)
      return
    }
    setName(form.name)
    setCycleType(form.cycleType)
    setPolicy(structuredClone(form.policy))
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init per form id
  }, [form?.id])

  const usage = form ? countScorecardFormUsage(form.id, cycles) : 0
  const allocated = usage > 0

  if (!formsHydrated) {
    return (
      <PageStatus
        variant="loading"
        pageClassName="pd-reviews"
        aria-label="Loading scorecards builder"
        description="Loading form…"
      />
    )
  }

  if (!form || !policy) {
    return <Navigate to={scorecardsBuilderPath()} replace />
  }

  const save = () => {
    if (saving) return
    if (allocated) {
      // Name-only updates are allowed; policy stays frozen while allocated.
      setError(null)
      setSaving(true)
      void updateScorecardForm(form.id, {
        name,
        expectedVersion: form.version,
        usageCount: usage,
      })
        .then(() => {
          setNotice(successNotice('Form name saved. Scorecard content is locked while allocated.'))
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Could not save the form.')
        })
        .finally(() => setSaving(false))
      return
    }
    const weight = pillarWeightTotal(policy)
    if (weight !== 100) {
      setError(
        `Enabled pillars must add up to 100%. They currently add up to ${weight}%.`,
      )
      return
    }
    setError(null)
    setSaving(true)
    void updateScorecardForm(form.id, {
      name,
      cycleType,
      policy,
      expectedVersion: form.version,
      usageCount: usage,
    })
      .then(() => {
        setNotice(successNotice('Form saved.'))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not save the form.')
      })
      .finally(() => setSaving(false))
  }

  const duplicate = () => {
    if (duplicating) return
    setDuplicating(true)
    setError(null)
    void createScorecardForm({
      name: `${name.trim() || form.name} (copy)`,
      description: form.description,
      cycleType,
      policy,
    })
      .then((created) => {
        setNotice(successNotice('Duplicated. Edit the copy — the original stays unchanged.'))
        navigate(scorecardsBuilderPath(created.id))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not duplicate the form.')
      })
      .finally(() => setDuplicating(false))
  }

  const remove = () => {
    if (deleting) return
    setDeleteOpen(false)
    setDeleting(true)
    setError(null)
    void deleteScorecardForm(form.id, { usageCount: usage })
      .then(() => navigate(scorecardsBuilderPath()))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not delete the form.')
      })
      .finally(() => setDeleting(false))
  }

  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-reviews pd-scorecards-builder"
      aria-label="Scorecards Library"
    >
      <ReviewSaveBanner notice={notice} onDismiss={() => setNotice(null)} />
      <header className="pd-scorecards-builder__hero">
        <div className="pd-scorecards-builder__heading">
          <button
            type="button"
            className="pd-reviews-edit__back"
            onClick={() => navigate(scorecardsBuilderPath())}
            aria-label="Back to Scorecards Library"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </button>
          <div className="pd-scorecards-builder__titles">
            <label className="pd-scorecards-builder__name-field">
              <span className="pd-sr-only">Form name</span>
              <input
                className="pd-scorecards-builder__name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Form name"
              />
            </label>
            <p className="pd-scorecards-builder__lede">
              {allocated
                ? `Allocated to ${usage} cycle group${usage === 1 ? '' : 's'} — scorecard is locked. Duplicate to edit.`
                : 'Not allocated to any cycle group yet.'}
            </p>
            <div className="pd-scorecards-builder__cycle-type">
              <span className="pd-field__label" id="scorecard-cycle-type-label">
                Cycle Type
              </span>
              <SegmentedControl
                aria-labelledby="scorecard-cycle-type-label"
                value={cycleType}
                onChange={setCycleType}
                options={CYCLE_TYPE_OPTIONS.map((option) => ({
                  ...option,
                  disabled: allocated,
                  title: allocated
                    ? 'Duplicate this form to change the cycle type.'
                    : undefined,
                }))}
              />
            </div>
          </div>
        </div>
        <div className="pd-scorecards-builder__actions">
          {allocated ? (
            <Button
              variant="primary"
              pill
              loading={duplicating}
              onClick={duplicate}
            >
              <Copy size={16} strokeWidth={2} aria-hidden />
              Duplicate to edit
            </Button>
          ) : (
            <Button
              variant="primary"
              pill
              className="pd-scorecards-builder__grade-areas"
              aria-label="Grade Areas"
              onClick={() => setGradesOpen(true)}
            >
              <Settings2 size={16} strokeWidth={2} aria-hidden />
              Grade Areas
            </Button>
          )}
          <Button
            variant="ghost"
            pill
            loading={deleting}
            disabled={allocated}
            aria-label="Delete form"
            title={
              allocated
                ? 'Allocated forms cannot be deleted. Duplicate first, or unallocate from cycle groups.'
                : undefined
            }
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={16} strokeWidth={2} aria-hidden />
            Delete
          </Button>
          <Button
            variant="secondary"
            pill
            onClick={() => navigate(scorecardsBuilderPath())}
          >
            Cancel
          </Button>
          <Button variant="primary" pill loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </header>
      {allocated ? (
        <p className="pd-scorecards-builder__lock-banner" role="status">
          {ALLOCATED_FORM_POLICY_LOCK}
        </p>
      ) : null}
      {error ? (
        <p className="pd-reviews-edit__error" role="alert">
          {error}
        </p>
      ) : null}
      <ScorecardFormEditor
        policy={policy}
        onChange={setPolicy}
        hideGradesToolbar
        gradesOpen={gradesOpen}
        onGradesOpenChange={setGradesOpen}
        locked={allocated}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={remove}
        title="Delete this form?"
        description={
          <>
            Delete “{name.trim() || 'Untitled form'}”? This cannot be undone.
            Type <strong>delete</strong> to confirm.
          </>
        }
        confirmLabel="Delete Form"
        cancelLabel="Cancel"
        confirmVariant="danger"
        requireText="delete"
        requireTextLabel="Type delete to confirm"
      />
    </div>
  )
}

export default function ScorecardsBuilderPage() {
  const { formId } = useParams()
  if (formId) {
    return <ScorecardsBuilderEditor formId={formId} />
  }
  return <ScorecardsBuilderIndex />
}
