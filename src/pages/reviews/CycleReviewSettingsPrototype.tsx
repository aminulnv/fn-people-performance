import { ClipboardList, Pencil, Scale } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  CALIBRATION_MODE_META,
  enabledReviewTypeLabels,
  GRADE_BAND_META,
  GRADE_BAND_ORDER,
  GRADE_RECOMMENDATION_META,
} from "@/lib/reviews/labels";
import { formatDateRange } from "@/lib/reviews/periods";
import type { ReviewCycle } from "@/lib/reviews/types";
import { exclusionsLabel } from "./GradePublishingExclusionsDrawer";

type CycleReviewSettingsPrototypeProps = {
  cycle: ReviewCycle;
  onEditReview: () => void;
  onEditCalibration: () => void;
};

/** Review and calibration settings restored for client demos — full edit UI, prototype scope. */
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
            Review settings
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
              <dt>Performance review window</dt>
              <dd>
                {formatDateRange(
                  performanceReview.managerStart.date,
                  performanceReview.managerEnd.date,
                )}
              </dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Review types</dt>
              <dd>{enabledReviewTypeLabels(cycle.settings)}</dd>
            </div>
            <div className="pd-reviews-kv__row">
              <dt>Grade publishing exclusion</dt>
              <dd>
                {exclusionsLabel(cycle.settings.excludedEmployeeIds?.length ?? 0)}
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
          className="pd-reviews-settings__card pd-reviews-settings__card--prototype"
          title={
            <span className="pd-reviews-card-title">
              <Scale size={16} strokeWidth={1.75} aria-hidden />
              Calculation &amp; calibration logic
            </span>
          }
          description="How grades are recommended and distributed during calibration."
          actions={<EditButton onClick={onEditCalibration} />}
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
                  GRADE_RECOMMENDATION_META[cycle.calibration.gradeRecommendation]
                    .label
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
