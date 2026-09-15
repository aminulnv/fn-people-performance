import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ClipboardList, Copy, Plus, Settings2, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, EmptyState, PageStatus } from '@/components/ui'
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
  SCORECARD_TEMPLATES,
  type ScorecardTemplateId,
} from '@/lib/reviews/scorecardTemplates'
import type { ReviewPolicy } from '@/lib/reviews/types'
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

function ScorecardsBuilderIndex() {
  const navigate = useNavigate()
  const forms = useScorecardFormsSnapshot()
  const formsHydrated = useScorecardFormsHydrated()
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      forms.map((form) => ({
        form,
        usage: countScorecardFormUsage(form.id, cycles),
      })),
    [cycles, forms],
  )

  if (!formsHydrated || !cyclesHydrated) {
    return (
      <PageStatus
        variant="loading"
        pageClassName="pd-reviews"
        aria-label="Loading scorecards builder"
        description="Loading forms…"
      />
    )
  }

  const createForm = async (templateId: ScorecardTemplateId = 'blank') => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const policy = applyScorecardTemplate(
        defaultReviewPolicy('custom'),
        templateId,
      )
      const created = await createScorecardForm({
        name: FORM_TEMPLATE_NAMES[templateId] ?? 'Untitled form',
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
      aria-label="Scorecards builder"
    >
      <header className="pd-scorecards-builder__hero">
        <div className="pd-scorecards-builder__titles">
          <h1 className="pd-scorecards-builder__title">
            <ClipboardList size={22} strokeWidth={2} aria-hidden />
            Scorecards Builder
          </h1>
          <p className="pd-scorecards-builder__lede">
            Build reusable scorecard forms, then allocate them to cycle groups.
          </p>
        </div>
        <div className="pd-scorecards-builder__actions">
          <NewFormMenu creating={creating} onPick={(id) => void createForm(id)} />
        </div>
      </header>
      {error ? (
        <p className="pd-reviews-edit__error" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No scorecard forms yet"
          description="Create a form document here, then allocate it from a cycle group’s Reviews settings."
          action={
            <NewFormMenu creating={creating} onPick={(id) => void createForm(id)} />
          }
        />
      ) : (
        <ul className="pd-scorecards-builder__list">
          {rows.map(({ form, usage }) => (
            <li key={form.id}>
              <Link
                className="pd-scorecards-builder__row"
                to={scorecardsBuilderPath(form.id)}
              >
                <span className="pd-scorecards-builder__row-main">
                  <span className="pd-scorecards-builder__row-title">
                    {form.name}
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
          ))}
        </ul>
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
      aria-label="Scorecards builder"
    >
      <ReviewSaveBanner notice={notice} onDismiss={() => setNotice(null)} />
      <header className="pd-scorecards-builder__hero">
        <div className="pd-scorecards-builder__heading">
          <button
            type="button"
            className="pd-reviews-edit__back"
            onClick={() => navigate(scorecardsBuilderPath())}
            aria-label="Back to forms"
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
