import { useState, type CSSProperties, type ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  Flag,
} from "lucide-react";
import { Input, SegmentedControl, Switch } from "@/components/ui";
import { listEmployees } from "@/lib/employees/store";
import { notifyReviewDeadlineChanged } from "@/lib/notifications/reviewEvents";
import { updateCycleStagesConfig } from "@/lib/reviews/store";
import type {
  CycleStagesConfig,
  DateRange,
  PostWindowGoalPolicy,
  ReviewCycle,
  StageProcessMode,
} from "@/lib/reviews/types";
import { useAuth } from "@/lib/useAuth";
import { EditPageShell } from "./EditPageShell";
import { GoalCycleExtensionsEditor } from "./GoalCycleExtensionsEditor";

type StagesEditPageProps = {
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

export function StagesEditPage({ cycle, onClose }: StagesEditPageProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<CycleStagesConfig>(() =>
    structuredClone(cycle.stagesConfig),
  );
  const [postWindowGoalPolicy, setPostWindowGoalPolicy] =
    useState<PostWindowGoalPolicy>(cycle.settings.postWindowGoalPolicy);
  const [error, setError] = useState<string | null>(null);
  const allowLateSubmissions = postWindowGoalPolicy === "two_tier_approval";

  const processMode =
    PROCESS_MODES.find((mode) => mode.id === draft.processMode) ??
    PROCESS_MODES[0];

  const setProcessMode = (mode: StageProcessMode) => {
    setDraft((prev) => ({ ...prev, processMode: mode }));
  };

  const setGoalRange = (
    stage: keyof CycleStagesConfig["goals"],
    patch: Partial<DateRange>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      goals: { ...prev.goals, [stage]: { ...prev.goals[stage], ...patch } },
    }));
  };

  const setManagerCheckInDate = (
    field: "managerStart" | "managerEnd",
    date: string,
  ) => {
    setDraft((prev) => ({
      ...prev,
      performance: {
        ...prev.performance,
        [field]: { ...prev.performance[field], date },
      },
    }));
  };

  const save = async () => {
    try {
      await updateCycleStagesConfig(cycle.id, draft, { postWindowGoalPolicy });
      const recipients = listEmployees()
        .filter((employee) => employee.isActive)
        .map((employee) => ({
          id: String(employee.employeeId),
          name: employee.fullName,
        }));
      const changedDeadlines = [
        {
          stage: "goal setting",
          oldDate: cycle.stagesConfig.goals.employee.endDate,
          newDate: draft.goals.employee.endDate,
        },
        {
          stage: "line manager check-in",
          oldDate: cycle.stagesConfig.performance.managerEnd.date,
          newDate: draft.performance.managerEnd.date,
        },
      ];
      for (const change of changedDeadlines) {
        notifyReviewDeadlineChanged({
          actorId: user?.personId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          recipients,
          ...change,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save stages.");
    }
  };

  return (
    <EditPageShell
      title="Cycle stages"
      description={`Goal windows and line manager check-in dates for ${cycle.name}.`}
      onBack={onClose}
      onSave={save}
      error={error}
    >
      <section className="pd-reviews-edit-card pd-reviews-mode-card">
        <div className="pd-reviews-mode-card__copy">
          <header className="pd-reviews-edit-card__head">
            <CalendarClock size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">How stages advance</h3>
          </header>
          <p className="pd-reviews-edit-card__lede">{processMode.hint}</p>
        </div>
        <SegmentedControl
          aria-label="How to process cycle stages"
          options={PROCESS_MODES.map(({ id, label }) => ({ id, label }))}
          value={processMode.id}
          onChange={setProcessMode}
        />
      </section>

      <div className="pd-reviews-edit__columns">
        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <Flag size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Goal setting</h3>
          </header>
          <p className="pd-reviews-edit-card__lede">
            Set the employee goal deadline and what happens after it passes.
          </p>
          <StageTable columns={["Stage", "Opens", "Closes"]}>
            <StageRow label="Department goals">
              <DateCell
                label="Department goals open"
                value={draft.goals.department.startDate}
                onChange={(startDate) =>
                  setGoalRange("department", { startDate })
                }
              />
              <DateCell
                label="Department goals close"
                value={draft.goals.department.endDate}
                onChange={(endDate) => setGoalRange("department", { endDate })}
              />
            </StageRow>
            <StageRow label="Team goals">
              <DateCell
                label="Team goals open"
                value={draft.goals.team.startDate}
                onChange={(startDate) => setGoalRange("team", { startDate })}
              />
              <DateCell
                label="Team goals close"
                value={draft.goals.team.endDate}
                onChange={(endDate) => setGoalRange("team", { endDate })}
              />
            </StageRow>
            <StageRow
              label="Employee goals"
              hint="The switch below controls what happens after this date."
            >
              <DateCell
                label="Employee goals open"
                value={draft.goals.employee.startDate}
                onChange={(startDate) =>
                  setGoalRange("employee", { startDate })
                }
              />
              <DateCell
                label="Employee goals lock"
                value={draft.goals.employee.endDate}
                onChange={(endDate) => setGoalRange("employee", { endDate })}
              />
            </StageRow>
          </StageTable>
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
                setPostWindowGoalPolicy(
                  event.target.checked ? "two_tier_approval" : "hard_stop",
                )
              }
            />
          </div>
          <GoalCycleExtensionsEditor
            extensions={draft.goals.extensions ?? []}
            baseEndDate={draft.goals.employee.endDate}
            performanceStartDate={draft.performance.managerStart.date}
            onChange={(extensions) =>
              setDraft((current) => ({
                ...current,
                goals: { ...current.goals, extensions },
              }))
            }
          />
        </section>

        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">
              Line manager check-in
            </h3>
          </header>
          <p className="pd-reviews-edit-card__lede">
            After the cycle ends, line managers review goals and complete the
            check-in form in this window.
          </p>
          <StageTable columns={["Stage", "Starts", "Ends"]}>
            <StageRow label="Manager check-in">
              <DateCell
                label="Check-in starts"
                value={draft.performance.managerStart.date}
                onChange={(date) => setManagerCheckInDate("managerStart", date)}
              />
              <DateCell
                label="Check-in ends"
                value={draft.performance.managerEnd.date}
                onChange={(date) => setManagerCheckInDate("managerEnd", date)}
              />
            </StageRow>
          </StageTable>
        </section>
      </div>
    </EditPageShell>
  );
}

function StageTable({
  columns,
  children,
}: {
  columns: [string, ...string[]];
  children: ReactNode;
}) {
  const [rowHeading, ...dateHeadings] = columns;
  return (
    <div
      className="pd-stage-table"
      style={{ "--stage-date-columns": dateHeadings.length } as CssVars}
    >
      <div className="pd-stage-table__head">
        <span className="pd-stage-table__heading">{rowHeading}</span>
        {dateHeadings.map((heading) => (
          <span key={heading} className="pd-stage-table__heading">
            {heading}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

function StageRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="pd-stage-table__row">
      <div className="pd-stage-table__label">
        <span className="pd-stage-table__name">{label}</span>
        {hint ? <span className="pd-stage-table__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function DateCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      type="date"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

type CssVars = CSSProperties & Record<"--stage-date-columns", number>;
