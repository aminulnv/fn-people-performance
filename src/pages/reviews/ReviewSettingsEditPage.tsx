import { useState } from "react";
import {
  ArrowUp,
  BarChart3,
  Network,
  Pencil,
  Send,
  UserCheck,
  UserMinus,
  UserRound,
  Users,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui";
import { normalizeCycleSettings } from "@/lib/reviews/demoData";
import { REVIEW_TYPE_META, REVIEW_TYPE_ORDER } from "@/lib/reviews/labels";
import { updateCycleGroup } from "@/lib/reviews/store";
import type {
  CycleGroup,
  CycleSettings,
  CycleStagesConfig,
  ReviewCycle,
  ReviewTypeId,
} from "@/lib/reviews/types";
import { EditPageShell } from "./EditPageShell";
import {
  exclusionsLabel,
  GradePublishingExclusionsDrawer,
} from "./GradePublishingExclusionsDrawer";
import { StageWindowFields } from "./StageDateTable";

type ReviewSettingsEditPageProps = {
  cycle: ReviewCycle;
  group: CycleGroup;
  onClose: () => void;
  embedded?: boolean;
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
  group,
  onClose,
  embedded = false,
}: ReviewSettingsEditPageProps) {
  const source = group;
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeCycleSettings(source.settings),
  );
  const [stagesConfig, setStagesConfig] = useState<CycleStagesConfig>(() =>
    structuredClone(source.stagesConfig),
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

  const save = () => {
    setError(null);
    try {
      const patch = {
        settings: {
          reviewTypes: settings.reviewTypes,
          excludedEmployeeIds: settings.excludedEmployeeIds,
          autoScorecardGeneration: settings.autoScorecardGeneration,
        },
        stagesConfig,
      };
      const pending = updateCycleGroup(cycle.id, group.id, patch);
      void pending.catch(() => {
        /* Shown on the cycle page after close. */
      });
      if (!embedded) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <>
      <EditPageShell
        title={`${group.name} · Review settings`}
        description="Review window, types, and publishing for the people in this group."
        onBack={onClose}
        onSave={save}
        error={error}
        embedded={embedded}
      >
        <div className="pd-reviews-edit__body--wide">
          <section className="pd-reviews-edit-card pd-reviews-edit-card--window">
            <header className="pd-reviews-edit-card__head">
              <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Review window</h3>
            </header>
            <StageWindowFields
              startLabel="Starts"
              endLabel="Ends"
              startValue={stagesConfig.performance.managerStart.date}
              endValue={stagesConfig.performance.managerEnd.date}
              onStartChange={(date) =>
                setPerformanceReviewDate("managerStart", date)
              }
              onEndChange={(date) =>
                setPerformanceReviewDate("managerEnd", date)
              }
            />
          </section>

          <div className="pd-reviews-settings-edit pd-reviews-settings-edit--balanced">
            <section className="pd-reviews-edit-card pd-reviews-review-types-card">
              <div className="pd-reviews-edit-card__heading">
                <header className="pd-reviews-edit-card__head">
                  <Users size={16} strokeWidth={1.75} aria-hidden />
                  <h3 className="pd-reviews-edit-card__title">Review types</h3>
                </header>
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
                            {meta.label.replace(/ reviews$/i, "")}
                          </span>
                          {meta.badge === "required" ? (
                            <span className="pd-reviews-chip pd-reviews-chip--required">
                              Required
                            </span>
                          ) : null}
                          {meta.badge === "recommended" ? (
                            <span className="pd-reviews-chip pd-reviews-chip--recommended">
                              Recommended
                            </span>
                          ) : null}
                        </div>
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
              </div>
              <div className="pd-reviews-publish-list">
                <div className="pd-reviews-publish-row">
                  <div className="pd-reviews-publish-row__icon" aria-hidden>
                    <UserMinus size={16} strokeWidth={1.75} />
                  </div>
                  <h4 className="pd-reviews-publish-row__title">
                    Grade exclusions
                  </h4>
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
                  <h4 className="pd-reviews-publish-row__title">
                    Auto scorecards
                  </h4>
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
