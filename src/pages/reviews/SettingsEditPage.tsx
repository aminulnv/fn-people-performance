import { useState } from "react";
import { CalendarRange, Target } from "lucide-react";
import { Input } from "@/components/ui";
import { normalizeCycleSettings } from "@/lib/reviews/demoData";
import { updateCycleSettings } from "@/lib/reviews/store";
import type { CycleSettings, ReviewCycle } from "@/lib/reviews/types";
import { EditPageShell } from "./EditPageShell";

type SettingsEditPageProps = {
  cycle: ReviewCycle;
  onClose: () => void;
};

export function SettingsEditPage({ cycle, onClose }: SettingsEditPageProps) {
  const [name, setName] = useState(cycle.name);
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate);
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeCycleSettings(cycle.settings),
  );
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      await updateCycleSettings(cycle.id, {
        name,
        startDate,
        endDate,
        ...settings,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <EditPageShell
      title="Cycle details"
      description="Set the cycle identity and goal submission rules."
      onBack={onClose}
      onSave={save}
      error={error}
    >
      <div className="pd-reviews-settings-edit">
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

        <section className="pd-reviews-edit-card">
          <div className="pd-reviews-edit-card__heading">
            <header className="pd-reviews-edit-card__head">
              <Target size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Goal-count policy</h3>
            </header>
            <p className="pd-reviews-edit-card__lede">
              Required limits block submission. Recommended limits only show a
              warning.
            </p>
          </div>
          <div className="pd-reviews-policy-grid">
            <Input
              label="Minimum required"
              hint="Hard lower limit"
              type="number"
              min={1}
              step={1}
              value={settings.goalCountPolicy.minimumRequired}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  goalCountPolicy: {
                    ...prev.goalCountPolicy,
                    minimumRequired: Number(event.target.value),
                  },
                }))
              }
            />
            <Input
              label="Maximum allowed"
              hint="Optional hard upper limit"
              type="number"
              min={1}
              step={1}
              placeholder="No maximum"
              value={settings.goalCountPolicy.maximumAllowed ?? ""}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  goalCountPolicy: {
                    ...prev.goalCountPolicy,
                    maximumAllowed:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  },
                }))
              }
            />
            <Input
              label="Recommended minimum"
              hint="Warn below this number"
              type="number"
              min={1}
              step={1}
              value={settings.goalCountPolicy.recommendedMinimum}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  goalCountPolicy: {
                    ...prev.goalCountPolicy,
                    recommendedMinimum: Number(event.target.value),
                  },
                }))
              }
            />
            <Input
              label="Recommended maximum"
              hint="Warn above this number"
              type="number"
              min={1}
              step={1}
              value={settings.goalCountPolicy.recommendedMaximum}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  goalCountPolicy: {
                    ...prev.goalCountPolicy,
                    recommendedMaximum: Number(event.target.value),
                  },
                }))
              }
            />
          </div>
        </section>
      </div>
    </EditPageShell>
  );
}
