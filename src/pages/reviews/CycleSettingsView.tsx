import { useState } from "react";
import { CalendarRange, Pencil, Target } from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  goalCountPolicyLabel,
  postWindowGoalPolicyLabel,
  processModeHint,
  processModeLabel,
} from "@/lib/reviews/labels";
import { formatDateRange } from "@/lib/reviews/periods";
import {
  createCycleGroup,
  deleteCycleGroup,
} from "@/lib/reviews/store";
import type { ReviewCycle } from "@/lib/reviews/types";
import { CycleSettingsCalendar } from "./CycleSettingsCalendar";
import { CycleDetailsEditPage } from "./CycleDetailsEditPage";
import { CalibrationEditPage } from "./CalibrationEditPage";
import { CycleGroupsSection } from "./CycleGroupsSection";
import { CycleReviewSettingsPrototype } from "./CycleReviewSettingsPrototype";
import { GoalsSettingsEditPage } from "./GoalsSettingsEditPage";
import { GroupSettingsView } from "./GroupSettingsView";
import { ReviewSettingsEditPage } from "./ReviewSettingsEditPage";

type CycleSettingsViewProps = {
  cycle: ReviewCycle;
  onEditingChange?: (editing: boolean) => void;
};

type EditTarget =
  | "cycle-details"
  | "goals-settings"
  | "review-settings"
  | "calibration"
  | { groupId: string }
  | null;

export function CycleSettingsView({
  cycle,
  onEditingChange,
}: CycleSettingsViewProps) {
  const [editing, setEditing] = useState<EditTarget>(null);

  const openEdit = (target: EditTarget) => {
    setEditing(target);
    onEditingChange?.(target !== null);
  };

  const closeEdit = () => {
    setEditing(null);
    onEditingChange?.(false);
  };

  if (editing === "cycle-details") {
    return <CycleDetailsEditPage cycle={cycle} onClose={closeEdit} />;
  }
  if (editing === "goals-settings") {
    return <GoalsSettingsEditPage cycle={cycle} onClose={closeEdit} />;
  }
  if (editing === "review-settings") {
    return <ReviewSettingsEditPage cycle={cycle} onClose={closeEdit} />;
  }
  if (editing === "calibration") {
    return <CalibrationEditPage cycle={cycle} onClose={closeEdit} />;
  }
  if (editing && typeof editing === "object") {
    const group = (cycle.groups ?? []).find((item) => item.id === editing.groupId);
    if (group) {
      return (
        <GroupSettingsView
          cycle={cycle}
          group={group}
          onClose={closeEdit}
          onEditingChange={onEditingChange}
        />
      );
    }
  }

  const extensionCount = cycle.stagesConfig.goals.extensions?.length ?? 0;
  const processMode = cycle.stagesConfig.processMode;
  const goalWindow = cycle.stagesConfig.goals.employee;

  return (
    <div className="pd-reviews-settings">
      <div className="pd-reviews-settings__hero">
        <Card
          className="pd-reviews-settings__card pd-reviews-settings__card--details"
          title={
            <span className="pd-reviews-card-title">
              <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
              Cycle details
            </span>
          }
          actions={<EditButton onClick={() => openEdit("cycle-details")} />}
        >
          <dl className="pd-reviews-kv pd-reviews-kv--compact">
            <div className="pd-reviews-kv__row">
              <dt>Cycle name</dt>
              <dd>{cycle.name}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Cycle timeframe</dt>
              <dd>{formatDateRange(cycle.startDate, cycle.endDate)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>How stages advance</dt>
              <dd>
                <span className="pd-reviews-settings__process-label">
                  {processModeLabel(processMode)}
                </span>
                <span className="pd-reviews-settings__process-hint">
                  {processModeHint(processMode)}
                </span>
              </dd>
            </div>
          </dl>
        </Card>

        <div className="pd-reviews-settings__hero-calendar">
          <CycleSettingsCalendar cycle={cycle} size="large" />
        </div>
      </div>

      <CycleGroupsSection
        cycle={cycle}
        onCreate={(input) => {
          void createCycleGroup(cycle.id, input).catch(() => {});
        }}
        onDelete={(groupId) => {
          void deleteCycleGroup(cycle.id, groupId).catch(() => {});
        }}
        onOpenGroup={(groupId) => openEdit({ groupId })}
      />

      <section
        className="pd-reviews-settings__section"
        aria-labelledby="cycle-goals-settings-heading"
      >
        <div className="pd-reviews-settings__section-head">
          <div>
            <h3
              className="pd-reviews-settings__section-title"
              id="cycle-goals-settings-heading"
            >
              Goal setting
            </h3>
            <p className="pd-reviews-settings__section-lede">
              Goal windows, submission limits, and post-deadline behaviour.
            </p>
          </div>
        </div>

        <Card
          className="pd-reviews-settings__card"
          title={
            <span className="pd-reviews-card-title">
              <Target size={16} strokeWidth={1.75} aria-hidden />
              Goals settings
            </span>
          }
          description="Employee goal-setting window and submission rules."
          actions={<EditButton onClick={() => openEdit("goals-settings")} />}
        >
          <dl className="pd-reviews-kv pd-reviews-kv--compact">
            <div className="pd-reviews-kv__row">
              <dt>Goal-setting window</dt>
              <dd>{formatDateRange(goalWindow.startDate, goalWindow.endDate)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Goal-count policy</dt>
              <dd>{goalCountPolicyLabel(cycle.settings.goalCountPolicy)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Submissions after deadline</dt>
              <dd>
                {postWindowGoalPolicyLabel(cycle.settings.postWindowGoalPolicy)}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Deadline extensions</dt>
              <dd>
                {extensionCount === 0
                  ? "None configured"
                  : `${extensionCount} configured`}
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      <CycleReviewSettingsPrototype
        cycle={cycle}
        onEditReview={() => openEdit("review-settings")}
        onEditCalibration={() => openEdit("calibration")}
      />
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" size="sm" pill onClick={onClick}>
      <Pencil size={13} strokeWidth={2} aria-hidden />
      Edit
    </Button>
  );
}
