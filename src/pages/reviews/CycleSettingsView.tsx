import { useState } from "react";
import { CalendarClock, Pencil, Scale, Settings2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  CALIBRATION_MODE_META,
  enabledReviewTypeLabels,
  GRADE_BAND_META,
  GRADE_BAND_ORDER,
  GRADE_RECOMMENDATION_META,
  stagesConfigToTimeline,
} from "@/lib/reviews/labels";
import { formatDateRange } from "@/lib/reviews/periods";
import type { ReviewCycle } from "@/lib/reviews/types";
import { CalibrationEditPage } from "./CalibrationEditPage";
import { CycleStagesTimeline } from "./CycleStagesTimeline";
import { exclusionsLabel } from "./GradePublishingExclusionsDrawer";
import { SettingsEditPage } from "./SettingsEditPage";
import { StagesEditPage } from "./StagesEditPage";

type CycleSettingsViewProps = {
  cycle: ReviewCycle;
  onEditingChange?: (editing: boolean) => void;
};

type EditTarget = "stages" | "settings" | "calibration" | null;

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

  if (editing === "stages") {
    return <StagesEditPage cycle={cycle} onClose={closeEdit} />;
  }
  if (editing === "settings") {
    return <SettingsEditPage cycle={cycle} onClose={closeEdit} />;
  }
  if (editing === "calibration") {
    return <CalibrationEditPage cycle={cycle} onClose={closeEdit} />;
  }

  const timeline = stagesConfigToTimeline(cycle.stagesConfig);
  const isManual = cycle.stagesConfig.processMode === "manual";
  const autoScorecards = cycle.settings.autoScorecardGeneration;

  return (
    <div className="pd-reviews-settings">
      <Card
        className="pd-reviews-settings__card"
        title={
          <span className="pd-reviews-card-title">
            <CalendarClock size={16} strokeWidth={1.75} aria-hidden />
            Cycle stages
          </span>
        }
        description={
          isManual
            ? "Stages are advanced manually — dates below are guidance."
            : "Stages open and close automatically on these dates."
        }
        actions={<EditButton onClick={() => openEdit("stages")} />}
      >
        <CycleStagesTimeline stages={timeline} />
      </Card>

      <div className="pd-reviews-settings__pair">
        <Card
          className="pd-reviews-settings__card"
          title={
            <span className="pd-reviews-card-title">
              <Settings2 size={16} strokeWidth={1.75} aria-hidden />
              Cycle details
            </span>
          }
          actions={<EditButton onClick={() => openEdit("settings")} />}
        >
          <dl className="pd-reviews-kv">
            <div className="pd-reviews-kv__row">
              <dt>Cycle name</dt>
              <dd>{cycle.name}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Cycle timeframe</dt>
              <dd>{formatDateRange(cycle.startDate, cycle.endDate)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Review types</dt>
              <dd>{enabledReviewTypeLabels(cycle.settings)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Goal-count policy</dt>
              <dd>{goalCountPolicyLabel(cycle.settings.goalCountPolicy)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Submissions after deadline</dt>
              <dd>
                {cycle.settings.postWindowGoalPolicy === "two_tier_approval"
                  ? "Allowed · two-tier approval"
                  : "Not allowed"}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Grade publishing exclusion</dt>
              <dd>
                {exclusionsLabel(
                  cycle.settings.excludedEmployeeIds?.length ?? 0,
                )}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Auto scorecard generation</dt>
              <dd>
                <Badge variant={autoScorecards ? "completed" : "neutral"}>
                  {autoScorecards ? "Enabled" : "Disabled"}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          className="pd-reviews-settings__card"
          title={
            <span className="pd-reviews-card-title">
              <Scale size={16} strokeWidth={1.75} aria-hidden />
              Calculation & Calibration logic
            </span>
          }
          actions={<EditButton onClick={() => openEdit("calibration")} />}
        >
          <dl className="pd-reviews-kv">
            <div className="pd-reviews-kv__row">
              <dt>Calibration mode</dt>
              <dd>
                {CALIBRATION_MODE_META[cycle.calibration.calibrationMode].label}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Grade recommendation logic</dt>
              <dd>
                {
                  GRADE_RECOMMENDATION_META[
                    cycle.calibration.gradeRecommendation
                  ].label
                }
              </dd>
            </div>
            <div className="pd-reviews-kv__row pd-reviews-kv__row--stacked">
              <dt>Calibration grade distribution</dt>
              <dd>
                <ul className="pd-reviews-bands">
                  {GRADE_BAND_ORDER.map((band) => (
                    <li key={band} className="pd-reviews-bands__item">
                      <span className="pd-reviews-bands__value">
                        {cycle.calibration.gradeDistribution[band]}%
                      </span>
                      <span className="pd-reviews-bands__label">
                        {GRADE_BAND_META[band].label}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

function goalCountPolicyLabel(
  policy: ReviewCycle["settings"]["goalCountPolicy"],
): string {
  const hardRange = policy.maximumAllowed
    ? `${policy.minimumRequired}–${policy.maximumAllowed} required`
    : `${policy.minimumRequired}+ required`;
  return `${hardRange} · ${policy.recommendedMinimum}–${policy.recommendedMaximum} recommended`;
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" pill onClick={onClick}>
      <Pencil size={13} strokeWidth={2} aria-hidden />
      Edit
    </Button>
  );
}
