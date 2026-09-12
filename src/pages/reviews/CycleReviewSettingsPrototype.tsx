import { ClipboardList, Construction, Pencil, Scale } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { enabledReviewTypeLabels } from "@/lib/reviews/labels";
import { formatLocalDateRange } from "@/lib/dates/timezone";
import type { ReviewCycle } from "@/lib/reviews/types";
import { exclusionsLabel } from "./GradePublishingExclusionsDrawer";

type CycleReviewSettingsPrototypeProps = {
  cycle: ReviewCycle;
  onEditReview: () => void;
  onEditCalibration: () => void;
};

/** Review and calibration settings restored for client demos - full edit UI, prototype scope. */
export function CycleReviewSettingsPrototype({
  cycle,
  onEditReview,
  onEditCalibration,
}: CycleReviewSettingsPrototypeProps) {
  const autoScorecards = cycle.settings.autoScorecardGeneration;
  const performanceReview = cycle.stagesConfig.performance;

  return (
    <section
      className="pd-reviews-settings__section pd-reviews-settings__section--prototype"
      aria-labelledby="cycle-review-settings-heading"
    >
      <div className="pd-reviews-settings__section-head">
        <div>
          <h3
            className="pd-reviews-settings__section-title"
            id="cycle-review-settings-heading"
          >
            Review Settings
          </h3>
          <p className="pd-reviews-settings__section-lede">
            Performance review window, review types, publishing rules, and
            calibration logic.
          </p>
        </div>
        <Badge variant="pending">Prototype</Badge>
      </div>

      <div className="pd-reviews-settings__pair">
        <Card
          className="pd-reviews-settings__card pd-reviews-settings__card--prototype"
          title={
            <span className="pd-reviews-card-title">
              <ClipboardList size={16} strokeWidth={1.75} aria-hidden />
              Review configuration
            </span>
          }
          description="Review window, types, and how results are published."
          actions={<EditButton onClick={onEditReview} />}
        >
          <dl className="pd-reviews-kv">
            <div className="pd-reviews-kv__row">
              <dt>Performance Review Window</dt>
              <dd>
                {formatLocalDateRange(
                  performanceReview.managerStart,
                  performanceReview.managerEnd,
                )}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Review Types</dt>
              <dd>{enabledReviewTypeLabels(cycle.settings)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Rating Publication</dt>
              <dd>
                {exclusionsLabel(cycle.settings.excludedEmployeeIds?.length ?? 0)}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Auto Scorecard Generation</dt>
              <dd>
                <Badge variant={autoScorecards ? "completed" : "neutral"}>
                  {autoScorecards ? "Enabled" : "Disabled"}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          className="pd-reviews-settings__card pd-reviews-settings__card--prototype"
          title={
            <span className="pd-reviews-card-title">
              <Scale size={16} strokeWidth={1.75} aria-hidden />
              Calibration
            </span>
          }
          description="Calibration settings will appear here."
          actions={<EditButton onClick={onEditCalibration} />}
        >
          <EmptyState
            className="pd-empty--construction pd-empty--inline"
            icon={Construction}
            title="Under development"
            description="Group calibration settings are being rebuilt."
          />
        </Card>
      </div>
    </section>
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
