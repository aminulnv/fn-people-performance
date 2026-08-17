import { useState } from "react";
import { CalendarRange, Target } from "lucide-react";
import { Input, Switch } from "@/components/ui";
import { ApiError } from "@/lib/apiClient";
import { listEmployees } from "@/lib/employees/store";
import { notifyReviewDeadlineChanged } from "@/lib/notifications/reviewEvents";
import { normalizeCycleSettings } from "@/lib/reviews/demoData";
import {
  getReviewCycle,
  updateCycleSettings,
  updateCycleStagesConfig,
} from "@/lib/reviews/store";
import type {
  CycleSettings,
  CycleStagesConfig,
  DateRange,
  PostWindowGoalPolicy,
  ReviewCycle,
} from "@/lib/reviews/types";
import { useAuth } from "@/lib/useAuth";
import { EditPageShell } from "./EditPageShell";
import { GoalCycleExtensionsEditor } from "./GoalCycleExtensionsEditor";
import { DateCell, StageRow, StageTable } from "./StageDateTable";

type GoalsSettingsEditPageProps = {
  cycle: ReviewCycle;
  onClose: () => void;
};

export function GoalsSettingsEditPage({ cycle, onClose }: GoalsSettingsEditPageProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeCycleSettings(cycle.settings),
  );
  const [goals, setGoals] = useState(() => structuredClone(cycle.stagesConfig.goals));
  const [error, setError] = useState<string | null>(null);
  const allowLateSubmissions =
    settings.postWindowGoalPolicy === "two_tier_approval";

  const setGoalRange = (patch: Partial<DateRange>) => {
    setGoals((current) => ({
      ...current,
      employee: { ...current.employee, ...patch },
    }));
  };

  const save = async () => {
    try {
      await updateCycleSettings(cycle.id, settings);

      const current = getReviewCycle(cycle.id) ?? cycle;
      const nextStagesConfig: CycleStagesConfig = {
        ...current.stagesConfig,
        goals,
      };
      await updateCycleStagesConfig(current.id, nextStagesConfig);

      const recipients = listEmployees()
        .filter((employee) => employee.isActive)
        .map((employee) => ({
          id: String(employee.employeeId),
          name: employee.fullName,
        }));

      if (cycle.stagesConfig.goals.employee.endDate !== goals.employee.endDate) {
        notifyReviewDeadlineChanged({
          actorId: user?.personId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          recipients,
          stage: "goal setting",
          oldDate: cycle.stagesConfig.goals.employee.endDate,
          newDate: goals.employee.endDate,
        });
      }

      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        setError(body?.error ?? err.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <EditPageShell
      title="Goals settings"
      description="Goal windows, submission rules, and deadline extensions."
      onBack={onClose}
      onSave={save}
      error={error}
    >
      <div className="pd-reviews-settings-edit">
        <div className="pd-reviews-settings-edit__column">
          <section className="pd-reviews-edit-card">
            <header className="pd-reviews-edit-card__head">
              <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Goal windows</h3>
            </header>
            <p className="pd-reviews-edit-card__lede">
              When goal setting opens and closes during the cycle.
            </p>
            <StageTable columns={["Stage", "Opens", "Closes"]}>
              <StageRow label="Goal setting">
                <DateCell
                  label="Goal setting opens"
                  value={goals.employee.startDate}
                  onChange={(startDate) => setGoalRange({ startDate })}
                />
                <DateCell
                  label="Goal setting locks"
                  value={goals.employee.endDate}
                  onChange={(endDate) => setGoalRange({ endDate })}
                />
              </StageRow>
            </StageTable>
            <GoalCycleExtensionsEditor
              extensions={goals.extensions ?? []}
              baseEndDate={goals.employee.endDate}
              performanceStartDate={
                cycle.stagesConfig.performance.managerStart.date
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

          <section className="pd-reviews-edit-card">
            <div className="pd-reviews-goal-policy">
              <div>
                <h4 className="pd-reviews-goal-policy__title">
                  Allow submissions after deadline
                </h4>
                <p className="pd-reviews-goal-policy__desc">
                  {allowLateSubmissions
                    ? "People can still create and submit goals. Those submissions need direct manager and skip-level manager approval."
                    : "Goal creation, editing, and submission stop when the deadline passes."}
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
          </section>
        </div>
      </div>
    </EditPageShell>
  );
}
