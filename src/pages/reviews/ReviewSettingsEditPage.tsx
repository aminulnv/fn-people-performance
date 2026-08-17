import { useState } from "react";
import {
  ArrowUp,
  BarChart3,
  Network,
  Pencil,
  Send,
  Sparkles,
  UserCheck,
  UserMinus,
  UserRound,
  Users,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui";
import { listEmployees } from "@/lib/employees/store";
import { notifyReviewDeadlineChanged } from "@/lib/notifications/reviewEvents";
import { normalizeCycleSettings } from "@/lib/reviews/demoData";
import { REVIEW_TYPE_META, REVIEW_TYPE_ORDER } from "@/lib/reviews/labels";
import { updateCycleSettings, updateCycleStagesConfig } from "@/lib/reviews/store";
import type {
  CycleSettings,
  CycleStagesConfig,
  ReviewCycle,
  ReviewTypeId,
} from "@/lib/reviews/types";
import { useAuth } from "@/lib/useAuth";
import { EditPageShell } from "./EditPageShell";
import {
  exclusionsLabel,
  GradePublishingExclusionsDrawer,
} from "./GradePublishingExclusionsDrawer";
import { DateCell, StageRow, StageTable } from "./StageDateTable";

type ReviewSettingsEditPageProps = {
  cycle: ReviewCycle;
  onClose: () => void;
};

const REVIEW_TYPE_ICONS: Record<ReviewTypeId, LucideIcon> = {
  line_manager: UserCheck,
  self: UserRound,
  upwards: ArrowUp,
  peer: UsersRound,
  functional_manager: Network,
};

export function ReviewSettingsEditPage({
  cycle,
  onClose,
}: ReviewSettingsEditPageProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeCycleSettings(cycle.settings),
  );
  const [stagesConfig, setStagesConfig] = useState<CycleStagesConfig>(() =>
    structuredClone(cycle.stagesConfig),
  );
  const [error, setError] = useState<string | null>(null);
  const [exclusionsOpen, setExclusionsOpen] = useState(false);

  const toggleType = (id: ReviewTypeId, enabled: boolean) => {
    if (REVIEW_TYPE_META[id].required) return;
    setSettings((prev) =>
      normalizeCycleSettings({
        ...prev,
        reviewTypes: { ...prev.reviewTypes, [id]: enabled },
      }),
    );
  };

  const setPerformanceReviewDate = (
    field: "managerStart" | "managerEnd",
    date: string,
  ) => {
    setStagesConfig((prev) => ({
      ...prev,
      performance: {
        ...prev.performance,
        [field]: { ...prev.performance[field], date },
      },
    }));
  };

  const save = async () => {
    try {
      await updateCycleSettings(cycle.id, {
        reviewTypes: settings.reviewTypes,
        excludedEmployeeIds: settings.excludedEmployeeIds,
        autoScorecardGeneration: settings.autoScorecardGeneration,
      });
      await updateCycleStagesConfig(cycle.id, stagesConfig);

      const recipients = listEmployees()
        .filter((employee) => employee.isActive)
        .map((employee) => ({
          id: String(employee.employeeId),
          name: employee.fullName,
        }));
      if (
        cycle.stagesConfig.performance.managerEnd.date !==
        stagesConfig.performance.managerEnd.date
      ) {
        notifyReviewDeadlineChanged({
          actorId: user?.personId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          recipients,
          stage: "performance review",
          oldDate: cycle.stagesConfig.performance.managerEnd.date,
          newDate: stagesConfig.performance.managerEnd.date,
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <>
      <EditPageShell
        title="Review settings"
        description="Configure the performance review window, review types, and publishing."
        onBack={onClose}
        onSave={save}
        error={error}
      >
        <div className="pd-reviews-edit__body pd-reviews-edit__body--stacked">
          <section className="pd-reviews-edit-card">
            <header className="pd-reviews-edit-card__head">
              <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Performance review</h3>
            </header>
            <p className="pd-reviews-edit-card__lede">
              After goal setting ends, line managers complete performance
              reviews in this window.
            </p>
            <StageTable columns={["Stage", "Starts", "Ends"]}>
              <StageRow label="Performance review">
                <DateCell
                  label="Review starts"
                  value={stagesConfig.performance.managerStart.date}
                  onChange={(date) =>
                    setPerformanceReviewDate("managerStart", date)
                  }
                />
                <DateCell
                  label="Review ends"
                  value={stagesConfig.performance.managerEnd.date}
                  onChange={(date) =>
                    setPerformanceReviewDate("managerEnd", date)
                  }
                />
              </StageRow>
            </StageTable>
          </section>

          <div className="pd-reviews-settings-edit pd-reviews-settings-edit--balanced">
            <section className="pd-reviews-edit-card pd-reviews-review-types-card">
              <div className="pd-reviews-edit-card__heading">
                <header className="pd-reviews-edit-card__head">
                  <Users size={16} strokeWidth={1.75} aria-hidden />
                  <h3 className="pd-reviews-edit-card__title">Review types</h3>
                </header>
                <p className="pd-reviews-edit-card__lede">
                  Each enabled type creates a separate scorecard.
                </p>
              </div>
              <ul className="pd-reviews-type-list">
                {REVIEW_TYPE_ORDER.map((id) => {
                  const meta = REVIEW_TYPE_META[id];
                  const enabled = settings.reviewTypes[id];
                  const ReviewTypeIcon = REVIEW_TYPE_ICONS[id];
                  return (
                    <li
                      key={id}
                      className={[
                        "pd-reviews-type-list__item",
                        enabled ? "is-enabled" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="pd-reviews-type-list__icon" aria-hidden>
                        <ReviewTypeIcon size={16} strokeWidth={1.75} />
                      </div>
                      <div className="pd-reviews-type-list__text">
                        <div className="pd-reviews-type-list__title-row">
                          <span className="pd-reviews-type-list__label">
                            {meta.label}
                          </span>
                          {meta.badge === "required" ? (
                            <span className="pd-reviews-chip pd-reviews-chip--required">
                              Required
                            </span>
                          ) : null}
                          {meta.badge === "recommended" ? (
                            <span className="pd-reviews-chip pd-reviews-chip--recommended">
                              <Sparkles size={12} strokeWidth={2} aria-hidden />
                              Recommended
                            </span>
                          ) : null}
                        </div>
                        <p className="pd-reviews-type-list__desc">
                          {meta.description}
                        </p>
                      </div>
                      <Switch
                        label={meta.label}
                        className="pd-reviews-type-list__switch"
                        checked={Boolean(enabled)}
                        disabled={Boolean(meta.required)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleType(id, e.target.checked);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="pd-reviews-edit-card">
              <div className="pd-reviews-edit-card__heading">
                <header className="pd-reviews-edit-card__head">
                  <Send size={16} strokeWidth={1.75} aria-hidden />
                  <h3 className="pd-reviews-edit-card__title">Publishing</h3>
                </header>
                <p className="pd-reviews-edit-card__lede">
                  Control grade delivery and scorecard processing.
                </p>
              </div>
              <div className="pd-reviews-publish-list">
                <div className="pd-reviews-publish-row">
                  <div className="pd-reviews-publish-row__icon" aria-hidden>
                    <UserMinus size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="pd-reviews-publish-row__title">
                      Grade exclusions
                    </h4>
                    <p className="pd-reviews-publish-row__desc">
                      People who will not receive their grade automatically.
                    </p>
                  </div>
                  <div className="pd-reviews-publish-row__meta">
                    <span className="pd-reviews-publish-row__value">
                      <UserRound size={14} strokeWidth={1.75} aria-hidden />
                      {exclusionsLabel(settings.excludedEmployeeIds.length)}
                    </span>
                    <button
                      type="button"
                      className="pd-reviews-edit-link"
                      onClick={() => setExclusionsOpen(true)}
                    >
                      <Pencil size={14} strokeWidth={2} aria-hidden />
                      Manage
                    </button>
                  </div>
                </div>

                <div className="pd-reviews-publish-row">
                  <div className="pd-reviews-publish-row__icon" aria-hidden>
                    <WandSparkles size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="pd-reviews-publish-row__title">
                      Auto scorecard generation
                    </h4>
                    <p className="pd-reviews-publish-row__desc">
                      Keep scorecards in sync as the cycle advances.
                    </p>
                  </div>
                  <Switch
                    label="Auto scorecard generation"
                    className="pd-reviews-type-list__switch"
                    checked={settings.autoScorecardGeneration}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoScorecardGeneration: e.target.checked,
                      }))
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </EditPageShell>

      <GradePublishingExclusionsDrawer
        open={exclusionsOpen}
        cycleName={cycle.name}
        selectedIds={settings.excludedEmployeeIds}
        onChange={(ids) =>
          setSettings((prev) => ({
            ...prev,
            excludedEmployeeIds: ids,
          }))
        }
        onClose={() => setExclusionsOpen(false)}
      />
    </>
  );
}
