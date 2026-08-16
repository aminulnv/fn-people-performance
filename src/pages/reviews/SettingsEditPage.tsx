import { useState } from "react";
import {
  ArrowUp,
  CalendarRange,
  Network,
  Pencil,
  Send,
  Sparkles,
  Target,
  UserCheck,
  UserMinus,
  UserRound,
  Users,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { Input, Switch } from "@/components/ui";
import { REVIEW_TYPE_META, REVIEW_TYPE_ORDER } from "@/lib/reviews/labels";
import { normalizeCycleSettings } from "@/lib/reviews/demoData";
import { updateCycleSettings } from "@/lib/reviews/store";
import type {
  CycleSettings,
  ReviewCycle,
  ReviewTypeId,
} from "@/lib/reviews/types";
import { EditPageShell } from "./EditPageShell";
import {
  exclusionsLabel,
  GradePublishingExclusionsDrawer,
} from "./GradePublishingExclusionsDrawer";

type SettingsEditPageProps = {
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

export function SettingsEditPage({ cycle, onClose }: SettingsEditPageProps) {
  const [name, setName] = useState(cycle.name);
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate);
  const [settings, setSettings] = useState<CycleSettings>(() =>
    normalizeCycleSettings(cycle.settings),
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

  const save = () => {
    try {
      updateCycleSettings(cycle.id, {
        name,
        startDate,
        endDate,
        ...settings,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  };

  return (
    <>
      <EditPageShell
        title="Cycle details"
        description="Set the cycle identity, review inputs, and publishing behaviour."
        onBack={onClose}
        onSave={save}
        error={error}
      >
        <div className="pd-reviews-settings-edit">
          <div className="pd-reviews-settings-edit__column">
            <section className="pd-reviews-edit-card">
              <header className="pd-reviews-edit-card__head">
                <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
                <h3 className="pd-reviews-edit-card__title">
                  Cycle information
                </h3>
              </header>
              <Input
                label="Cycle name"
                hint="Shown throughout Goals and Performance Review."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="pd-reviews-modal__dates">
                <Input
                  label="Starts"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="Ends"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </section>

            <section className="pd-reviews-edit-card">
              <div className="pd-reviews-edit-card__heading">
                <header className="pd-reviews-edit-card__head">
                  <Target size={16} strokeWidth={1.75} aria-hidden />
                  <h3 className="pd-reviews-edit-card__title">
                    Goal-count policy
                  </h3>
                </header>
                <p className="pd-reviews-edit-card__lede">
                  Required limits block submission. Recommended limits only show
                  a warning.
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
        </div>
      </EditPageShell>

      <GradePublishingExclusionsDrawer
        open={exclusionsOpen}
        cycleName={name}
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
