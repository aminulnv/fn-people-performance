import { useState } from "react";
import { CalendarRange, Target } from "lucide-react";
import { Switch } from "@/components/ui";
import { normalizeCycleSettings } from "@/lib/reviews/demoData";
import { updateCycleGroup } from "@/lib/reviews/store";
import type {
  CycleGroup,
  CycleSettings,
  DateRange,
  PostWindowGoalPolicy,
  ReviewCycle,
} from "@/lib/reviews/types";
import { CountStepperField } from "./CountStepperField";
import { EditPageShell } from "./EditPageShell";
import { StageWindowFields } from "./StageDateTable";

type GoalsSettingsEditPageProps = {
  cycle: ReviewCycle;
  group: CycleGroup;
  onClose: () => void;
  embedded?: boolean;
};

export function GoalsSettingsEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
}: GoalsSettingsEditPageProps) {
  const source = group;
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeCycleSettings(source.settings),
  );
  const [goals, setGoals] = useState(() => structuredClone(source.stagesConfig.goals));
  const [error, setError] = useState<string | null>(null);
  const allowLateSubmissions =
    settings.postWindowGoalPolicy === "two_tier_approval";

  const setGoalRange = (patch: Partial<DateRange>) => {
    setGoals((current) => ({
      ...current,
      employee: { ...current.employee, ...patch },
    }));
  };

  const save = () => {
    setError(null);
    try {
      const stagesConfig = {
        ...source.stagesConfig,
        goals: { ...goals, extensions: [] },
      };
      const pending = updateCycleGroup(cycle.id, group.id, {
        settings,
        stagesConfig,
      });
      void pending.catch(() => {
        /* Shown on the cycle page after close. */
      });
      if (!embedded) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <EditPageShell
      title={`${group.name} · Goals settings`}
      description="Goal windows and submission rules for the people in this group."
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
    >
      <div className="pd-reviews-settings-edit">
        <div className="pd-reviews-settings-edit__column">
          <section className="pd-reviews-edit-card pd-reviews-edit-card--window">
            <header className="pd-reviews-edit-card__head">
              <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Goal window</h3>
            </header>
            <StageWindowFields
              startLabel="Opens"
              endLabel="Closes"
              startValue={goals.employee.startDate}
              endValue={goals.employee.endDate}
              onStartChange={(startDate) => setGoalRange({ startDate })}
              onEndChange={(endDate) => setGoalRange({ endDate })}
            />
          </section>
        </div>

        <div className="pd-reviews-settings-edit__column">
          <section className="pd-reviews-edit-card">
            <div className="pd-reviews-edit-card__heading">
              <header className="pd-reviews-edit-card__head">
                <Target size={16} strokeWidth={1.75} aria-hidden />
                <h3 className="pd-reviews-edit-card__title">Goal count</h3>
              </header>
            </div>
            <div className="pd-reviews-policy">
              <div className="pd-reviews-policy__group">
                <h4 className="pd-reviews-policy__title">Required</h4>
                <div className="pd-reviews-policy-grid">
                  <CountStepperField
                    label="Minimum"
                    value={settings.goalCountPolicy.minimumRequired}
                    onChange={(minimumRequired) =>
                      setSettings((prev) => ({
                        ...prev,
                        goalCountPolicy: {
                          ...prev.goalCountPolicy,
                          minimumRequired: minimumRequired ?? 1,
                        },
                      }))
                    }
                  />
                  <CountStepperField
                    label="Maximum"
                    allowEmpty
                    placeholder="None"
                    emptyStepTo={settings.goalCountPolicy.recommendedMaximum}
                    value={settings.goalCountPolicy.maximumAllowed}
                    onChange={(maximumAllowed) =>
                      setSettings((prev) => ({
                        ...prev,
                        goalCountPolicy: {
                          ...prev.goalCountPolicy,
                          maximumAllowed,
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="pd-reviews-policy__group">
                <h4 className="pd-reviews-policy__title">Recommended</h4>
                <div className="pd-reviews-policy-grid">
                  <CountStepperField
                    label="Minimum"
                    value={settings.goalCountPolicy.recommendedMinimum}
                    onChange={(recommendedMinimum) =>
                      setSettings((prev) => ({
                        ...prev,
                        goalCountPolicy: {
                          ...prev.goalCountPolicy,
                          recommendedMinimum: recommendedMinimum ?? 1,
                        },
                      }))
                    }
                  />
                  <CountStepperField
                    label="Maximum"
                    value={settings.goalCountPolicy.recommendedMaximum}
                    onChange={(recommendedMaximum) =>
                      setSettings((prev) => ({
                        ...prev,
                        goalCountPolicy: {
                          ...prev.goalCountPolicy,
                          recommendedMaximum: recommendedMaximum ?? 1,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="pd-reviews-edit-card pd-reviews-edit-card--policy">
            <div className="pd-reviews-goal-policy pd-reviews-goal-policy--card">
              <h4 className="pd-reviews-goal-policy__title">
                Allow after deadline
              </h4>
              <Switch
                label="Allow submissions after deadline"
                className="pd-reviews-type-list__switch"
                checked={allowLateSubmissions}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    postWindowGoalPolicy: (event.target.checked
                      ? "two_tier_approval"
                      : "hard_stop") satisfies PostWindowGoalPolicy,
                  }))
                }
              />
            </div>
          </section>
        </div>
      </div>
    </EditPageShell>
  );
}
