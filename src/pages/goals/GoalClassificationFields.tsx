import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { ListboxSelect } from '@/components/ui'
import {
  GOAL_PRIORITY_OPTIONS,
  GOAL_TYPE_OPTIONS,
  PROCESS_TYPE_OPTIONS,
} from '@/lib/goals/classification'
import type {
  Goal,
  GoalPriority,
  GoalType,
  ProcessType,
} from '@/lib/goals/types'
import type { RequestGoalEdit } from './useGoalEditGuard'

export type GoalClassificationPatch = Partial<
  Pick<Goal, 'goalType' | 'processType' | 'priority'>
>

type ClassificationField = 'goalType' | 'processType' | 'priority'

type GoalClassificationFieldsProps = {
  goal: Goal
  disabled?: boolean
  canEdit?: boolean
  onRequestEdit?: RequestGoalEdit
  onChange?: (next: GoalClassificationPatch) => void
}

export function GoalClassificationFields({
  goal,
  disabled = false,
  canEdit = false,
  onRequestEdit = (startEditing) => startEditing(),
  onChange,
}: GoalClassificationFieldsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [unlocked, setUnlocked] = useState<ClassificationField | null>(null)

  useEffect(() => {
    setUnlocked(null)
  }, [goal.id, disabled])

  useEffect(() => {
    if (!unlocked) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setUnlocked(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUnlocked(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [unlocked])

  const fieldDisabled = (field: ClassificationField) =>
    disabled && unlocked !== field

  const showEdit = (field: ClassificationField) =>
    canEdit && disabled && unlocked !== field

  return (
    <div
      ref={rootRef}
      className="pd-goal-class"
      aria-label="Goal classification"
    >
      <div className="pd-goal-class__item">
        <span className="pd-goal-class__label">Type</span>
        <div className="pd-goal-class__control">
          <ListboxSelect
            value={goal.goalType}
            allowEmpty={false}
            disabled={fieldDisabled('goalType')}
            aria-label="Goal type"
            options={GOAL_TYPE_OPTIONS}
            onValueChange={(value) =>
              onChange?.({ goalType: value as GoalType })
            }
          />
          {showEdit('goalType') ? (
            <button
              type="button"
              className="pd-goal-class__edit"
              aria-label="Edit goal type"
              onClick={() =>
                onRequestEdit(() => setUnlocked('goalType'))
              }
            >
              <Pencil size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      <div className="pd-goal-class__item">
        <span className="pd-goal-class__label">Process</span>
        <div className="pd-goal-class__control">
          <ListboxSelect
            value={goal.processType}
            allowEmpty={false}
            disabled={fieldDisabled('processType')}
            aria-label="Process type"
            options={PROCESS_TYPE_OPTIONS}
            onValueChange={(value) =>
              onChange?.({ processType: value as ProcessType })
            }
          />
          {showEdit('processType') ? (
            <button
              type="button"
              className="pd-goal-class__edit"
              aria-label="Edit process type"
              onClick={() =>
                onRequestEdit(() => setUnlocked('processType'))
              }
            >
              <Pencil size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      <div className="pd-goal-class__item">
        <span className="pd-goal-class__label">Priority</span>
        <div className="pd-goal-class__control">
          <ListboxSelect
            value={goal.priority}
            allowEmpty={false}
            disabled={fieldDisabled('priority')}
            aria-label="Priority"
            options={GOAL_PRIORITY_OPTIONS}
            onValueChange={(value) =>
              onChange?.({ priority: value as GoalPriority })
            }
          />
          {showEdit('priority') ? (
            <button
              type="button"
              className="pd-goal-class__edit"
              aria-label="Edit priority"
              onClick={() =>
                onRequestEdit(() => setUnlocked('priority'))
              }
            >
              <Pencil size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
