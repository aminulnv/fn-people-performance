import { useState } from "react";
import { CalendarRange, Target } from "lucide-react";
import { Switch } from "@/components/ui";
import { hasExplicitTime, toTimestamp } from "@/lib/dates/timestamp";
import { toUtcIso } from "@/lib/dates/timezone";
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
import { CycleModuleField, ModuleSettingsLock } from "./CycleModulesFields";
import { EditPageShell } from "./EditPageShell";
import { GoalCycleExtensionsEditor } from "./GoalCycleExtensionsEditor";
import { StageWindowFields } from "./StageDateTable";

type GoalsSettingsEditPageProps = {
  cycle: ReviewCycle;
  group: CycleGroup;
  onClose: () => void;
  embedded?: boolean;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onSuccess?: (message: string) => void;
};

export function GoalsSettingsEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
  enabled = true,
  onEnabledChange,
  onSuccess,
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
        goals: {
          ...goals,
          extensions: goals.extensions ?? [],
        },
      };
      const pending = updateCycleGroup(cycle.id, group.id, {
        settings,
        stagesConfig,
      });
      void pending.catch(() => {
        /* Shown on the cycle page after close. */
      });
      onSuccess?.("Settings saved.");
      if (!embedded) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <EditPageShell
      title={`${group.name} · Goals`}
      description={
        enabled
          ? "When people can set goals, and how many they need."
          : "Turn on Goals to set the window and how many people need."
      }
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
      showActions={enabled}
      actionsPlacement={embedded ? "bottom" : "top"}
    >
      {onEnabledChange ? (
        <section className="pd-reviews-edit-card pd-reviews-module-enable">
          <CycleModuleField
            id="goals"
            enabled={enabled}
            onChange={onEnabledChange}
          />
        </section>
      ) : null}
      <ModuleSettingsLock locked={!enabled} label="Goal settings">
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
              startValue={toUtcIso(
                toTimestamp(
                  goals.employee.startDate,
                  hasExplicitTime(goals.employee.startDate)
                    ? undefined
                    : source.stagesConfig.reviewStages?.find((stage) => stage.id === "goals")
                        ?.start?.time,
                ),
              )}
              endValue={toUtcIso(
                toTimestamp(
                  goals.employee.endDate,
                  hasExplicitTime(goals.employee.endDate)
                    ? undefined
                    : source.stagesConfig.reviewStages?.find((stage) => stage.id === "goals")
                        ?.end?.time,
                ),
              )}
              onStartChange={(startDate) => setGoalRange({ startDate })}
              onEndChange={(endDate) => setGoalRange({ endDate })}
            />
          </section>
          <section className="pd-reviews-edit-card">
            <GoalCycleExtensionsEditor
              extensions={goals.extensions ?? []}
              baseEndDate={goals.employee.endDate}
              performanceStartDate={
                source.stagesConfig.performance.employeeStart.date
              }
              onChange={(extensions) =>
                setGoals((current) => ({ ...current, extensions }))
              }
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
                <h4 className="pd-reviews-policy__title">People must have</h4>
                <div className="pd-reviews-policy-grid">
                  <CountStepperField
                    label="At least"
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
                    label="At most"
                    allowEmpty
                    placeholder="No limit"
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
              <details className="pd-cycle-setup__more">
                <summary>Suggested range</summary>
                <p className="pd-reviews-flow__hint">
                  A hint on the goals page. People can still submit if they stay
                  inside the required range.
                </p>
                <div className="pd-reviews-policy-grid">
                  <CountStepperField
                    label="From"
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
                    label="To"
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
              </details>
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
      </ModuleSettingsLock>
    </EditPageShell>
  );
}
