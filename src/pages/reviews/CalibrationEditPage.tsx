import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { EditPageShell } from './EditPageShell'

type CalibrationEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
  onSuccess?: (message: string) => void
}

/** Placeholder until the new calibration settings land here. */
export function CalibrationEditPage({
  group,
  onClose,
  embedded = false,
}: CalibrationEditPageProps) {
  return (
    <EditPageShell
      title={`${group.name} · Calibration`}
      description="Calibration settings for this group will appear here."
      onBack={onClose}
      onSave={() => {}}
      embedded={embedded}
      showActions={false}
      actionsPlacement="top"
    >
      <div className="pd-settings-stack pd-settings-stack--placeholder">
        <EmptyState
          className="pd-empty--construction"
          icon={Construction}
          title="Under development"
          description="Group calibration settings are being rebuilt. Check back soon."
        />
      </div>
    </EditPageShell>
  )
}
