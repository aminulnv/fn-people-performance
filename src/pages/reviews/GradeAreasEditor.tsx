import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, EmptyState, Input, Switch } from '@/components/ui'
import {
  clampPillarWeight,
  remainingPillarWeight,
  reweightEnabledPillars,
} from '@/lib/reviews/reviewPolicy'
import {
  addCustomPillar,
  removeScorecardPillar,
  updateScorecardPillar,
} from '@/lib/reviews/scorecardTemplates'
import type { ReviewPolicy } from '@/lib/reviews/types'
import { WeightHoverField } from '@/pages/goals/GoalMeasurementReadout'

export const GRADE_AREAS_TITLE = 'Grade Areas'
export const GRADE_AREAS_DESCRIPTION =
  'Turn areas on and set weights. This is how grading shows on the scorecard.'

export function GradeAreasHeaderActions({
  modifying,
  onModifyingChange,
  onDone,
  locked = false,
}: {
  modifying: boolean
  onModifyingChange: (next: boolean) => void
  onDone?: () => void
  locked?: boolean
}) {
  if (locked) return null
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        pill
        onClick={() => onModifyingChange(!modifying)}
      >
        {modifying ? 'Done Editing' : 'Modify'}
      </Button>
      {onDone ? (
        <Button
          variant="primary"
          size="sm"
          pill
          onClick={() => {
            onModifyingChange(false)
            onDone()
          }}
        >
          Done
        </Button>
      ) : null}
    </>
  )
}

/** Toggle areas on/off and set weights — shared by Builder modal and Review Form sheet. */
export function GradeAreasEditor({
  policy,
  onChange: onChangeProp,
  locked = false,
  modifying,
  onModifyingChange,
}: {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
  locked?: boolean
  modifying: boolean
  onModifyingChange: (next: boolean) => void
}) {
  const [focusPillarId, setFocusPillarId] = useState<string | null>(null)
  const onChange = locked ? () => {} : onChangeProp

  if (policy.scorecard.pillars.length === 0) {
    return (
      <EmptyState
        className="pd-empty--inline"
        title="No Grade Areas"
        description="Add areas to weight Goals, Skills, and other pillars."
        action={
          locked ? null : (
            <Button
              variant="primary"
              size="sm"
              pill
              onClick={() => {
                const next = addCustomPillar(policy)
                const created =
                  next.scorecard.pillars[next.scorecard.pillars.length - 1]
                onChange(next)
                onModifyingChange(true)
                if (created) setFocusPillarId(created.id)
              }}
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              Add Area
            </Button>
          )
        }
      />
    )
  }

  return (
    <div className="pd-people__panel pd-people__panel--table pd-reviews-form__grade-table-panel">
      <div className="pd-people__table-wrap">
        <table
          className="pd-people__table pd-reviews-form__grade-table"
          aria-label="Grade areas"
        >
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col" className="pd-reviews-form__grade-weight-col">
                Weight %
              </th>
              {modifying ? (
                <th scope="col">
                  <span className="pd-reviews-form-preview__sr">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {policy.scorecard.pillars.map((item) => (
              <tr
                key={item.id}
                className={item.enabled ? undefined : 'is-off'}
              >
                <td>
                  <div className="pd-reviews-form__grade-area">
                    <Switch
                      label={item.label}
                      className="pd-reviews-type-list__switch"
                      checked={item.enabled}
                      disabled={locked}
                      onChange={(event) => {
                        const next = updateScorecardPillar(policy, item.id, {
                          enabled: event.target.checked,
                          weight: event.target.checked
                            ? clampPillarWeight(policy, item.id, item.weight)
                            : item.weight,
                        })
                        onChange(
                          event.target.checked
                            ? next
                            : reweightEnabledPillars(next),
                        )
                      }}
                    />
                    {modifying ? (
                      <Input
                        aria-label="Area name"
                        className="pd-reviews-pillar-list__name-field"
                        value={item.label}
                        placeholder="Area name"
                        autoFocus={focusPillarId === item.id}
                        onFocus={() => setFocusPillarId(null)}
                        onChange={(event) =>
                          onChange(
                            updateScorecardPillar(policy, item.id, {
                              label: event.target.value,
                            }),
                          )
                        }
                      />
                    ) : (
                      <span className="pd-reviews-form__grade-area-name">
                        {item.label || 'Custom area'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="pd-reviews-form__grade-weight-col">
                  {item.enabled ? (
                    <WeightHoverField
                      weight={item.weight}
                      ariaLabel={`weight for ${item.label || 'Custom area'}`}
                      maxWeight={remainingPillarWeight(policy, item.id)}
                      showSuffix={false}
                      onChange={(nextWeight) =>
                        onChange(
                          updateScorecardPillar(policy, item.id, {
                            weight: clampPillarWeight(
                              policy,
                              item.id,
                              nextWeight,
                            ),
                          }),
                        )
                      }
                    />
                  ) : (
                    <span className="pd-reviews-pillar-list__off">Off</span>
                  )}
                </td>
                {modifying ? (
                  <td className="pd-reviews-form__grade-action-col">
                    <Button
                      variant="ghost"
                      size="sm"
                      pill
                      className="pd-reviews-pillar-list__remove"
                      aria-label={`Remove ${item.label || 'grading area'}`}
                      onClick={() =>
                        onChange(removeScorecardPillar(policy, item.id))
                      }
                    >
                      <Trash2 size={14} strokeWidth={2} aria-hidden />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modifying ? (
        <div className="pd-reviews-form__grade-footer">
          <Button
            variant="ghost"
            size="sm"
            pill
            onClick={() => {
              const next = addCustomPillar(policy)
              const created =
                next.scorecard.pillars[next.scorecard.pillars.length - 1]
              onChange(next)
              if (created) setFocusPillarId(created.id)
            }}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Self-contained Grade Areas block for the Review Form side sheet. */
export function GradeAreasPanel({
  policy,
  onChange,
  locked = false,
}: {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
  locked?: boolean
}) {
  const [modifying, setModifying] = useState(false)

  return (
    <section
      className="pd-reviews-form__grade-panel"
      aria-label={GRADE_AREAS_TITLE}
    >
      <header className="pd-reviews-form-sheet__grades-head">
        <div className="pd-reviews-form-sheet__grades-titles">
          <h3 className="pd-reviews-form-sheet__grades-title">
            {GRADE_AREAS_TITLE}
          </h3>
          <p className="pd-reviews-form-sheet__grades-lede">
            {GRADE_AREAS_DESCRIPTION}
          </p>
        </div>
        <div className="pd-reviews-form-sheet__grades-actions">
          <GradeAreasHeaderActions
            modifying={modifying}
            onModifyingChange={setModifying}
            locked={locked}
          />
        </div>
      </header>
      <fieldset
        disabled={locked}
        className="pd-reviews-form__lock-fieldset"
        aria-label={locked ? 'Allocated form (read-only)' : undefined}
      >
        <GradeAreasEditor
          policy={policy}
          onChange={onChange}
          locked={locked}
          modifying={modifying}
          onModifyingChange={setModifying}
        />
      </fieldset>
    </section>
  )
}
