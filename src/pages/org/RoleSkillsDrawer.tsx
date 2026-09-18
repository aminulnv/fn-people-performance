import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CircleMinus, CirclePlus, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { createSkill } from '@/lib/skills/store'
import type { Skill } from '@/lib/skills/types'
import type { RoleSkill } from '@/lib/roles/types'
import '@/styles/layout-reviews.css'

function emptySkill(skill: Skill): RoleSkill {
  return {
    skillId: skill.id,
    skillName: skill.name,
    weightPct: 0,
    expectations: {},
    descriptions: {},
  }
}

export function RoleSkillsDrawer({
  open,
  roleName,
  attached,
  library,
  onClose,
  onSave,
}: {
  open: boolean
  roleName: string
  attached: RoleSkill[]
  library: Skill[]
  onClose: () => void
  onSave: (next: RoleSkill[]) => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<RoleSkill[]>(attached)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createBusy, setCreateBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(attached)
    setQuery('')
    setCreating(false)
    setNewName('')
    setCreateError(null)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [attached, onClose, open])

  const attachedIds = useMemo(
    () => new Set(draft.map((row) => row.skillId)),
    [draft],
  )

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library
      .filter((skill) => !attachedIds.has(skill.id))
      .filter((skill) => {
        if (!q) return true
        return [skill.name, skill.department]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [attachedIds, library, query])

  function addSkill(skill: Skill) {
    setDraft((current) => {
      if (current.some((row) => row.skillId === skill.id)) return current
      return [...current, emptySkill(skill)]
    })
  }

  function removeSkill(skillId: string) {
    setDraft((current) => current.filter((row) => row.skillId !== skillId))
  }

  async function onCreateSkill() {
    const name = newName.trim()
    if (!name || createBusy) return
    setCreateBusy(true)
    setCreateError(null)
    try {
      const skill = await createSkill({ name })
      addSkill(skill)
      setNewName('')
      setCreating(false)
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Could not create skill.',
      )
    } finally {
      setCreateBusy(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="pd-reviews-drawer">
      <button
        type="button"
        className="pd-reviews-drawer__scrim"
        aria-label="Close add skills"
        onClick={onClose}
      />
      <aside
        className="pd-reviews-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="pd-reviews-drawer__header">
          <button
            ref={closeRef}
            type="button"
            className="pd-reviews-drawer__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
          <div className="pd-reviews-drawer__heading">
            <h2 id={titleId} className="pd-reviews-drawer__title">
              Add skills
            </h2>
            <p id={descriptionId} className="pd-reviews-drawer__subtitle">
              Attach library skills to {roleName}. Expectations stay on the
              matrix.
            </p>
            <Button
              variant="primary"
              size="sm"
              pill
              onClick={() => {
                setCreating((value) => !value)
                setCreateError(null)
              }}
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              Create New Skill
            </Button>
          </div>
        </header>

        {creating ? (
          <div className="pd-reviews-drawer__search pd-org-skills-drawer__create-block">
            <label className="pd-sr-only" htmlFor="role-skills-create-name">
              Skill name
            </label>
            <input
              id="role-skills-create-name"
              className="pd-reviews-drawer__search-input"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void onCreateSkill()
                }
              }}
              placeholder="New skill name"
              autoFocus
            />
            <Button
              variant="secondary"
              size="sm"
              pill
              disabled={createBusy || !newName.trim()}
              onClick={() => {
                void onCreateSkill()
              }}
            >
              Create
            </Button>
          </div>
        ) : null}
        {createError ? (
          <p className="pd-reviews-drawer__status pd-org-skills-drawer__error" role="alert">
            {createError}
          </p>
        ) : null}

        <div className="pd-reviews-drawer__body">
          <p className="pd-org-skills-drawer__group-label">{roleName} skills</p>
          {draft.length === 0 ? (
            <p className="pd-reviews-drawer__status">
              No skills on this role yet.
            </p>
          ) : (
            <ul className="pd-reviews-drawer__list">
              {draft.map((row) => (
                <li key={row.skillId}>
                  <button
                    type="button"
                    className="pd-reviews-drawer__row is-selected"
                    onClick={() => removeSkill(row.skillId)}
                    aria-label={`Remove ${row.skillName}`}
                  >
                    <CircleMinus
                      size={18}
                      strokeWidth={1.75}
                      className="pd-org-skills-drawer__icon pd-org-skills-drawer__icon--remove"
                      aria-hidden
                    />
                    <span className="pd-reviews-drawer__row-text">
                      <span className="pd-reviews-drawer__row-name">
                        {row.skillName}
                      </span>
                    </span>
                    <Check
                      size={16}
                      strokeWidth={2.25}
                      className="pd-reviews-drawer__check"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="pd-org-skills-drawer__group-label">All skills</p>
          <div className="pd-reviews-drawer__search pd-org-skills-drawer__inline-search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <label className="pd-sr-only" htmlFor="role-skills-search">
              Search skills
            </label>
            <input
              id="role-skills-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="pd-reviews-drawer__search-input"
            />
          </div>
          {available.length === 0 ? (
            <p className="pd-reviews-drawer__status">
              {library.length === draft.length
                ? 'Every library skill is already on this role.'
                : 'No skills match.'}
            </p>
          ) : (
            <ul className="pd-reviews-drawer__list">
              {available.map((skill) => (
                <li key={skill.id}>
                  <button
                    type="button"
                    className="pd-reviews-drawer__row"
                    onClick={() => addSkill(skill)}
                    aria-label={`Add ${skill.name}`}
                  >
                    <CirclePlus
                      size={18}
                      strokeWidth={1.75}
                      className="pd-org-skills-drawer__icon pd-org-skills-drawer__icon--add"
                      aria-hidden
                    />
                    <span className="pd-reviews-drawer__row-text">
                      <span className="pd-reviews-drawer__row-name">
                        {skill.name}
                      </span>
                      {skill.department ? (
                        <span className="pd-reviews-drawer__row-meta">
                          {skill.department}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="pd-reviews-drawer__footer">
          <span>
            {draft.length === 0
              ? 'No skills selected'
              : `${draft.length} skill${draft.length === 1 ? '' : 's'}`}
          </span>
          <Button
            variant="primary"
            size="sm"
            pill
            onClick={() => {
              onSave(draft)
              onClose()
            }}
          >
            Save
          </Button>
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
