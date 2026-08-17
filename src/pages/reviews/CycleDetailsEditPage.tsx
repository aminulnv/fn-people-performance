import { useState } from "react";
import { CalendarClock, CalendarRange } from "lucide-react";
import { Input, SegmentedControl } from "@/components/ui";
import { updateCycleSettings, updateCycleStagesConfig } from "@/lib/reviews/store";
import type { ReviewCycle, StageProcessMode } from "@/lib/reviews/types";
import { EditPageShell } from "./EditPageShell";

type CycleDetailsEditPageProps = {
  cycle: ReviewCycle;
  onClose: () => void;
};

const PROCESS_MODES: { id: StageProcessMode; label: string; hint: string }[] =
  [
    {
      id: "schedule",
      label: "Schedule",
      hint: "Stages open and close automatically on the dates below.",
    },
    {
      id: "manual",
      label: "Manual",
      hint: "Dates below stay as guidance — you move the cycle forward yourself.",
    },
  ];

export function CycleDetailsEditPage({ cycle, onClose }: CycleDetailsEditPageProps) {
  const [name, setName] = useState(cycle.name);
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate);
  const [processMode, setProcessMode] = useState(cycle.stagesConfig.processMode);
  const [error, setError] = useState<string | null>(null);

  const activeMode =
    PROCESS_MODES.find((mode) => mode.id === processMode) ?? PROCESS_MODES[0];

  const save = async () => {
    try {
      await updateCycleSettings(cycle.id, { name, startDate, endDate });
      if (processMode !== cycle.stagesConfig.processMode) {
        await updateCycleStagesConfig(cycle.id, {
          ...cycle.stagesConfig,
          processMode,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <EditPageShell
      title="Cycle details"
      description="Set the cycle name, overall timeframe, and how stages advance."
      onBack={onClose}
      onSave={save}
      error={error}
    >
      <div className="pd-reviews-edit__body pd-reviews-edit__body--stacked">
        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Cycle information</h3>
          </header>
          <Input
            label="Cycle name"
            hint="Shown throughout Goals and Reviews."
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

        <section className="pd-reviews-edit-card pd-reviews-mode-card">
          <div className="pd-reviews-mode-card__copy">
            <header className="pd-reviews-edit-card__head">
              <CalendarClock size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">How stages advance</h3>
            </header>
            <p className="pd-reviews-edit-card__lede">{activeMode.hint}</p>
          </div>
          <SegmentedControl
            aria-label="How to process cycle stages"
            options={PROCESS_MODES.map(({ id, label }) => ({ id, label }))}
            value={activeMode.id}
            onChange={setProcessMode}
          />
        </section>
      </div>
    </EditPageShell>
  );
}
