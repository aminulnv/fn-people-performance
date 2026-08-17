import { useState } from "react";
import { CalendarClock, Pencil, Settings2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { stagesConfigToTimeline } from "@/lib/reviews/labels";
import { formatDateRange } from "@/lib/reviews/periods";
import type { ReviewCycle } from "@/lib/reviews/types";
import { CycleStagesTimeline } from "./CycleStagesTimeline";
import { SettingsEditPage } from "./SettingsEditPage";
import { StagesEditPage } from "./StagesEditPage";

type CycleSettingsViewProps = {
  cycle: ReviewCycle;
  onEditingChange?: (editing: boolean) => void;
};

type EditTarget = "stages" | "settings" | null;

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

  const timeline = stagesConfigToTimeline(cycle.stagesConfig);
  const isManual = cycle.stagesConfig.processMode === "manual";

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
        </dl>
      </Card>
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
