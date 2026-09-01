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
import { HintIcon } from "./HintIcon";
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
  const [saving, setSaving] = useState(false);
  const allowLateSubmissions =
    settings.postWindowGoalPolicy === "two_tier_approval";

  const setGoalRange = (patch: Partial<DateRange>) => {
    setGoals((current) => ({
      ...current,
      employee: { ...current.employee, ...patch },
    }));
  };

  const save = () => {
    if (saving) return;
    setError(null);
    try {
      setSaving(true);
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
      void pending
        .catch(() => {
          /* Shown on the cycle page after close. */
        })
        .finally(() => setSaving(false));
      onSuccess?.("Settings saved.");
      if (!embedded) onClose();
    } catch (err) {
      setSaving(false);
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
      saving={saving}
      error={error}
      embedded={embedded}
      showActions={enabled}
      actionsPlacement="top"
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
      <ModuleSettingsLock locked={!enabled} label="Goal Settings">
      <div className="pd-reviews-settings-edit">
        <div className="pd-reviews-settings-edit__column">
          <section className="pd-reviews-edit-card pd-reviews-edit-card--window">
            <header className="pd-reviews-edit-card__head">
              <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Goal Setting Window</h3>
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
              memberIds={group.memberIds}
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
                <h3 className="pd-reviews-edit-card__title">Goal Count</h3>
              </header>
            </div>
            <div className="pd-reviews-policy">
              <div className="pd-reviews-policy__group">
                <h4 className="pd-reviews-policy__title">People Must Have</h4>
                <div className="pd-reviews-policy-grid">
                  <CountStepperField
                    label="Min"
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
                    label="Max"
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
              <div className="pd-reviews-policy__group">
                <h4 className="pd-reviews-policy__title">
                  Recommended Goal Count
                  <HintIcon
                    content="A hint on the goals page. People can still submit if they stay inside the required range."
                    label="About Recommended Goal Count"
                  />
                </h4>
                <div className="pd-reviews-policy-grid">
                  <CountStepperField
                    label="Min"
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
                    label="Max"
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
                Allow After Deadline
                <HintIcon
                  content={
                    <ul className="pd-help-tip">
                      <li>
                        <strong>On</strong>
                        People can still submit. Late changes need manager and skip-level approval.
                      </li>
                      <li>
                        <strong>Off</strong>
                        Goal editing stops at the deadline.
                      </li>
                    </ul>
                  }
                  label="About Allow After Deadline"
                />
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
              </h4>
            </div>
          </section>
        </div>
      </div>
      </ModuleSettingsLock>
    </EditPageShell>
  );
}
