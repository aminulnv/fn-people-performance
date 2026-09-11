import { useState, type ReactNode } from "react";
import {
  CalendarRange,
  ChevronDown,
  Clock3,
  Hash,
  Sparkles,
  SlidersHorizontal,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
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
import { ModuleSettingsLock } from "./CycleModulesFields";
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

function formatCountRange(min: number, max: number | null): string {
  if (max == null) return `${min}+`;
  return `${min}–${max}`;
}

function SettingsHeading({
  icon: Icon,
  children,
  meta,
}: {
  icon: LucideIcon;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="pd-settings-stack__block-head">
      <h3 className="pd-settings-stack__eyebrow">
        <Icon size={14} strokeWidth={1.75} aria-hidden />
        {children}
      </h3>
      {meta ? <p className="pd-settings-stack__meta">{meta}</p> : null}
    </div>
  );
}

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
  const [goals, setGoals] = useState(() =>
    structuredClone(source.stagesConfig.goals),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const extensionCount = goals.extensions?.length ?? 0;
  const [advancedOpen, setAdvancedOpen] = useState(extensionCount > 0);

  const allowLateSubmissions =
    settings.postWindowGoalPolicy === "two_tier_approval";
  const requiredRange = formatCountRange(
    settings.goalCountPolicy.minimumRequired,
    settings.goalCountPolicy.maximumAllowed,
  );
  const recommendedRange = formatCountRange(
    settings.goalCountPolicy.recommendedMinimum,
    settings.goalCountPolicy.recommendedMaximum,
  );
  const progressDays = settings.goalCountPolicy.lateProgressUpdateDays ?? 30;

  const advancedSummary = [
    allowLateSubmissions ? "Late OK" : "Hard Stop",
    `Recommend ${recommendedRange}`,
    `${progressDays}d Progress`,
    extensionCount > 0
      ? `${extensionCount} Custom Deadline${extensionCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
      <div className="pd-settings-stack">
        {onEnabledChange ? (
          <div className="pd-settings-stack__row pd-settings-stack__row--master">
            <div className="pd-settings-stack__copy">
              <p className="pd-settings-stack__label">
                <Target size={15} strokeWidth={1.75} aria-hidden />
                Goals
              </p>
              <p className="pd-settings-stack__hint">
                People write and update goals for this group.
              </p>
            </div>
            <Switch
              label="Enable Goals"
              className="pd-reviews-type-list__switch"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
          </div>
        ) : null}

        <ModuleSettingsLock locked={!enabled} label="Goal Settings">
          <section className="pd-settings-stack__block">
            <SettingsHeading icon={CalendarRange}>Window</SettingsHeading>
            <StageWindowFields
              startLabel="Opens"
              endLabel="Closes"
              startValue={toUtcIso(
                toTimestamp(
                  goals.employee.startDate,
                  hasExplicitTime(goals.employee.startDate)
                    ? undefined
                    : source.stagesConfig.reviewStages?.find(
                        (stage) => stage.id === "goals",
                      )?.start?.time,
                ),
              )}
              endValue={toUtcIso(
                toTimestamp(
                  goals.employee.endDate,
                  hasExplicitTime(goals.employee.endDate)
                    ? undefined
                    : source.stagesConfig.reviewStages?.find(
                        (stage) => stage.id === "goals",
                      )?.end?.time,
                ),
              )}
              onStartChange={(startDate) => setGoalRange({ startDate })}
              onEndChange={(endDate) => setGoalRange({ endDate })}
            />
          </section>

          <section className="pd-settings-stack__block">
            <SettingsHeading icon={Hash} meta={`${requiredRange} Goals`}>
              Required Count
            </SettingsHeading>
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
          </section>

          <div className="pd-settings-stack__advanced">
            <button
              type="button"
              className="pd-settings-stack__advanced-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <span className="pd-settings-stack__advanced-copy">
                <span className="pd-settings-stack__advanced-label">
                  <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
                  Advanced
                </span>
                {!advancedOpen ? (
                  <span className="pd-settings-stack__advanced-summary">
                    {advancedSummary}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={
                  advancedOpen
                    ? "pd-settings-stack__chevron is-open"
                    : "pd-settings-stack__chevron"
                }
                aria-hidden
              />
            </button>

            {advancedOpen ? (
              <div className="pd-settings-stack__advanced-body">
                <div className="pd-settings-stack__row">
                  <div className="pd-settings-stack__copy">
                    <p className="pd-settings-stack__label">
                      <Timer size={15} strokeWidth={1.75} aria-hidden />
                      Allow After Deadline
                    </p>
                    <p className="pd-settings-stack__hint">
                      Late edits need manager and skip-level approval.
                    </p>
                  </div>
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

                <section className="pd-settings-stack__block">
                  <SettingsHeading
                    icon={Sparkles}
                    meta={`Soft Hint · ${recommendedRange}`}
                  >
                    Recommended
                  </SettingsHeading>
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
                </section>

                <section className="pd-settings-stack__block">
                  <SettingsHeading
                    icon={Clock3}
                    meta="After The Quarter Ends"
                  >
                    Progress Updates
                  </SettingsHeading>
                  <div className="pd-reviews-policy-grid">
                    <CountStepperField
                      label="Days after deadline"
                      min={0}
                      max={30}
                      value={progressDays}
                      onChange={(lateProgressUpdateDays) =>
                        setSettings((prev) => ({
                          ...prev,
                          goalCountPolicy: {
                            ...prev.goalCountPolicy,
                            lateProgressUpdateDays:
                              lateProgressUpdateDays ?? 0,
                          },
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="pd-settings-stack__block">
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
            ) : null}
          </div>
        </ModuleSettingsLock>
      </div>
    </EditPageShell>
  );
}
