import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Input } from "@/components/ui";
import { updateReviewCycle } from "@/lib/reviews/store";
import type { ReviewCycle } from "@/lib/reviews/types";
import { EditPageShell } from "./EditPageShell";

type CycleDetailsEditPageProps = {
  cycle: ReviewCycle;
  onClose: () => void;
  embedded?: boolean;
};

export function CycleDetailsEditPage({
  cycle,
  onClose,
  embedded = false,
}: CycleDetailsEditPageProps) {
  const [name, setName] = useState(cycle.name);
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    try {
      void updateReviewCycle(cycle.id, {
        name,
        startDate,
        endDate,
      }).catch(() => {
        /* Shown on the cycle page after close. */
      });
      if (!embedded) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <EditPageShell
      title="Cycle details"
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
      actionsPlacement="bottom"
    >
      <div className="pd-reviews-edit__body pd-reviews-edit__body--stacked">
        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Cycle information</h3>
          </header>
          <Input
            label="Cycle name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="pd-reviews-modal__dates">
            <Input
              label="Starts"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Ends"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </section>
      </div>
    </EditPageShell>
  );
}
