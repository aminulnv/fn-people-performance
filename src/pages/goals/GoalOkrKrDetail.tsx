import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowLeft,
  ClipboardPaste,
  ExternalLink,
  X,
} from "lucide-react";
import { Avatar, Button, SegmentedControl } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import { okrGoalDropPayload, requestApplyOkrToGoal } from "@/lib/okr/applyToGoal";
import {
  formatOkrDirection,
  formatOkrMeasure,
  formatOkrMilestoneStatus,
  formatOkrRole,
  formatOkrTrackingKind,
  okrLinkedKrPlatformUrl,
  okrMilestoneStatusTone,
  okrStatusTone,
  okrTrackingKind,
  okrWorkItemPlatformUrl,
  resolveRaciParty,
  type OkrDirectoryPerson,
  type OkrLinkedKr,
  type OkrRaci,
  type OkrWorkItem,
  type ResolvedOkrRaciParty,
} from "@/lib/okr/reference";

type KrDetailTab = "info" | "activity";

const RACI_COLUMNS = [
  { key: "accountable", label: "Accountable" },
  { key: "responsible", label: "Responsible" },
  { key: "consulted", label: "Consulted" },
  { key: "informed", label: "Informed" },
] as const;

const RACI_PREVIEW = 2;

function ringStroke(tone: ReturnType<typeof okrStatusTone>): string {
  if (tone === "ok") return "var(--color-success)";
  if (tone === "warn") return "var(--color-amber)";
  if (tone === "danger") return "var(--color-danger)";
  return "var(--color-text-muted)";
}

function accountablePeople(
  item: OkrWorkItem,
  directory: OkrDirectoryPerson[],
): ResolvedOkrRaciParty[] {
  return item.raci.accountable
    .map((party) => resolveRaciParty(party, directory))
    .filter((person) => person.name.trim());
}

function objectiveOwner(
  item: OkrWorkItem,
  directory: OkrDirectoryPerson[],
): ResolvedOkrRaciParty | null {
  const accountable = item.raci.accountable
    .map((party) => resolveRaciParty(party, directory))
    .find((person) => person.name.trim());
  if (accountable) return accountable;
  if (item.ownerLabel.trim()) {
    return {
      employeeId: null,
      name: item.ownerLabel,
      avatarUrl: "",
      linked: false,
    };
  }
  return null;
}

function ProgressRing({
  percent,
  tone,
}: {
  percent: number | null;
  tone: ReturnType<typeof okrStatusTone>;
}) {
  const value = Math.min(100, Math.max(0, Math.round(percent ?? 0)));
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className="pd-okr-kr-detail__ring"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress, ${value}% complete`}
    >
      <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden>
        <circle
          cx="23"
          cy="23"
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--color-text) 6%, transparent)"
          strokeWidth="4"
        />
        <circle
          cx="23"
          cy="23"
          r={radius}
          fill="none"
          stroke={ringStroke(tone)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeOpacity="0.95"
          transform="rotate(-90 23 23)"
        />
      </svg>
      <span className="pd-okr-kr-detail__ring-label">
        <b>{value}</b>
        <em>%</em>
      </span>
    </div>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: ReturnType<typeof okrStatusTone>;
}) {
  return (
    <span className={`pd-okr-kr-detail__chip pd-okr-kr-detail__chip--${tone}`}>
      {label}
    </span>
  );
}

function RaciPerson({ person }: { person: ResolvedOkrRaciParty }) {
  const inner = (
    <>
      <Avatar
        name={person.name}
        src={person.avatarUrl || undefined}
        size="sm"
        className="pd-okr-kr-detail__raci-avatar"
        alt=""
        style={avatarStyle(person.name)}
      />
      <span className="pd-okr-kr-detail__raci-name">{person.name}</span>
    </>
  );

  if (person.linked && person.employeeId != null) {
    return (
      <Link
        to={`/people/${person.employeeId}`}
        className="pd-okr-kr-detail__raci-person"
      >
        {inner}
      </Link>
    );
  }

  return <span className="pd-okr-kr-detail__raci-person">{inner}</span>;
}

function RaciColumn({
  label,
  people,
}: {
  label: string;
  people: ResolvedOkrRaciParty[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? people : people.slice(0, RACI_PREVIEW);
  const hiddenCount = people.length - RACI_PREVIEW;

  return (
    <div className="pd-okr-kr-detail__raci-col">
      <p className="pd-okr-kr-detail__raci-col-label">{label}</p>
      {people.length === 0 ? (
        <p className="pd-okr-kr-detail__raci-empty">-</p>
      ) : (
        <ul className="pd-okr-kr-detail__raci-people">
          {visible.map((person, index) => (
            <li key={`${person.employeeId ?? person.name}-${index}`}>
              <RaciPerson person={person} />
            </li>
          ))}
        </ul>
      )}
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="pd-okr-kr-detail__raci-more"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : `View all (${people.length})`}
        </button>
      ) : null}
    </div>
  );
}

function KrRaciSection({
  raci,
  directory,
}: {
  raci: OkrRaci;
  directory: OkrDirectoryPerson[];
}) {
  const columns = RACI_COLUMNS.map((column) => ({
    ...column,
    people: raci[column.key]
      .map((party) => resolveRaciParty(party, directory))
      .filter((person) => person.name.trim()),
  }));
  if (columns.every((column) => column.people.length === 0)) return null;

  return (
    <section className="pd-okr-kr-detail__section">
      <p className="pd-okr-kr-detail__kicker">RACI</p>
      <div className="pd-okr-kr-detail__raci-grid">
        {columns.map((column) => (
          <RaciColumn
            key={column.key}
            label={column.label}
            people={column.people}
          />
        ))}
      </div>
    </section>
  );
}

function linkedKrMeta(link: OkrLinkedKr): string {
  const weight =
    link.weight != null && Number.isFinite(link.weight)
      ? `${Math.round(link.weight)}% weight`
      : "";
  return [link.objectiveTitle, link.ownerLabel, weight]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

function KrLinkedKrsSection({
  item,
}: {
  item: OkrWorkItem;
}) {
  if (item.linkedKrs.length === 0) return null;

  return (
    <section className="pd-okr-kr-detail__section">
      <p className="pd-okr-kr-detail__kicker">Linked KRs</p>
      <ul className="pd-okr-kr-detail__linked-list">
        {item.linkedKrs.map((link, index) => {
          const meta = linkedKrMeta(link);
          return (
            <li key={link.keyResultId} className="pd-okr-kr-detail__linked-card">
              <span className="pd-okr-kr-detail__linked-icon" aria-hidden>
                <ArrowDownRight size={14} strokeWidth={2.25} />
              </span>
              <div className="pd-okr-kr-detail__linked-body">
                <div className="pd-okr-kr-detail__linked-chips">
                  <span className="pd-okr-kr-detail__linked-kr-badge">
                    KR {index + 1}
                  </span>
                  {link.tierLabel ? (
                    <span className="pd-okr-kr-detail__linked-tier">
                      {link.tierLabel}
                    </span>
                  ) : null}
                </div>
                <p className="pd-okr-kr-detail__linked-title" title={link.title}>
                  {link.title}
                </p>
                {meta ? (
                  <p className="pd-okr-kr-detail__linked-meta" title={meta}>
                    {meta}
                  </p>
                ) : null}
              </div>
              <a
                className="pd-okr-kr-detail__linked-tracker"
                href={okrLinkedKrPlatformUrl(link, item)}
                target="_blank"
                rel="noreferrer"
              >
                Show in tracker
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function KrInfoTab({
  item,
  directory,
}: {
  item: OkrWorkItem;
  directory: OkrDirectoryPerson[];
}) {
  const trackingKind = okrTrackingKind(item);
  const objective = objectiveOwner(item, directory);
  const krCopy =
    item.description.trim() ||
    item.title.trim() ||
    item.shortTitle.trim() ||
    "-";
  const unitLabel = item.unit.trim() || "-";

  return (
    <div className="pd-okr-kr-detail__stack">
      {item.objectiveTitle ? (
        <section className="pd-okr-kr-detail__section">
          <p className="pd-okr-kr-detail__label-plain">Connected Objective:</p>
          <div className="pd-okr-kr-detail__obj-card">
            <div className="pd-okr-kr-detail__obj-row">
              <div className="pd-okr-kr-detail__obj-main">
                {objective ? (
                  <Avatar
                    name={objective.name}
                    src={objective.avatarUrl || undefined}
                    size="md"
                    className="pd-okr-kr-detail__obj-avatar"
                    alt=""
                    style={avatarStyle(objective.name)}
                  />
                ) : null}
                <div className="pd-okr-kr-detail__obj-title-wrap">
                  <p className="pd-okr-kr-detail__obj-title">
                    <span className="pd-okr-kr-detail__obj-badge">OBJ</span>
                    {item.objectiveTitle}
                  </p>
                  {objective ? (
                    <p className="pd-okr-kr-detail__obj-owner">{objective.name}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="pd-okr-kr-detail__section">
        <p className="pd-okr-kr-detail__kicker">
          {item.kind === "special_project" ? "Special project" : "Key result"}
        </p>
        <p className="pd-okr-kr-detail__kr-copy">{krCopy}</p>

        <div className="pd-okr-kr-detail__meta">
          <div className="pd-okr-kr-detail__meta-grid">
            <div className="pd-okr-kr-detail__meta-cell">
              <p className="pd-okr-kr-detail__kicker">Measurement type</p>
              <p>{formatOkrTrackingKind(trackingKind)}</p>
            </div>
            <div className="pd-okr-kr-detail__meta-cell">
              <p className="pd-okr-kr-detail__kicker">Unit</p>
              <p>{unitLabel}</p>
            </div>
            <div className="pd-okr-kr-detail__meta-cell">
              <p className="pd-okr-kr-detail__kicker">Direction</p>
              <p>{formatOkrDirection(item.direction)}</p>
            </div>
            <div className="pd-okr-kr-detail__meta-cell">
              <p className="pd-okr-kr-detail__kicker">Start</p>
              <p>{formatOkrMeasure(item.startValue, item.unit) ?? "·"}</p>
            </div>
            <div className="pd-okr-kr-detail__meta-cell">
              <p className="pd-okr-kr-detail__kicker">Current</p>
              <p>{formatOkrMeasure(item.currentValue, item.unit) ?? "·"}</p>
            </div>
            <div className="pd-okr-kr-detail__meta-cell">
              <p className="pd-okr-kr-detail__kicker">Target</p>
              <p>{formatOkrMeasure(item.targetValue, item.unit) ?? "·"}</p>
            </div>
          </div>
        </div>

        {trackingKind === "milestone" || item.milestones.length > 0 ? (
          <div className="pd-okr-kr-detail__ms-wrap">
            <p className="pd-okr-kr-detail__kicker">Milestones</p>
            {item.milestones.length > 0 ? (
              <ul className="pd-okr-kr-detail__ms-list">
                {item.milestones.map((milestone, index) => {
                  const statusLabel = formatOkrMilestoneStatus(milestone.status);
                  const statusTone = okrMilestoneStatusTone(milestone.status);
                  return (
                    <li
                      key={milestone.id}
                      className={
                        statusTone === "ok"
                          ? "pd-okr-kr-detail__ms-item pd-okr-kr-detail__ms-item--done"
                          : "pd-okr-kr-detail__ms-item"
                      }
                    >
                      <span className="pd-okr-kr-detail__ms-n">{index + 1}</span>
                      <div className="pd-okr-kr-detail__ms-main">
                        <p className="pd-okr-kr-detail__ms-title">
                          {milestone.title}
                        </p>
                        {statusLabel ? (
                          <span
                            className={`pd-okr-kr-detail__ms-status pd-okr-kr-detail__ms-status--${statusTone}`}
                          >
                            {statusLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="pd-okr-kr-detail__ms-w">
                        <b>
                          {milestone.weight > 0
                            ? `${Math.round(milestone.weight)}%`
                            : "-"}
                        </b>
                        <small>of KR</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="pd-okr-kr-detail__ms-empty">
                No milestones listed for this key result.
              </p>
            )}
          </div>
        ) : null}
      </section>

      <KrRaciSection raci={item.raci} directory={directory} />
      <KrLinkedKrsSection item={item} />
    </div>
  );
}

function KrActivityTab({ item }: { item: OkrWorkItem }) {
  const checkIn = item.lastCheckIn;
  if (!checkIn) {
    return (
      <p className="pd-okr-kr-detail__empty">
        No activity recorded for this key result yet.
      </p>
    );
  }

  return (
    <div className="pd-okr-kr-detail__stack">
      <section className="pd-okr-kr-detail__section">
        <p className="pd-okr-kr-detail__kicker">Last check-in</p>
        <p className="pd-okr-kr-detail__kr-copy">
          {[
            checkIn.weekNumber != null ? `Week ${checkIn.weekNumber}` : "",
            checkIn.statusLabel,
            checkIn.authorName,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {checkIn.note ? (
          <p className="pd-okr-kr-detail__activity-note">{checkIn.note}</p>
        ) : null}
        {item.roles.length > 0 ? (
          <p className="pd-okr-kr-detail__activity-role">
            Role: {item.roles.map(formatOkrRole).join(", ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** OKR-platform-style key result detail shown when a reference row is selected. */
export function GoalOkrKrDetail({
  item,
  directory,
  onClose,
}: {
  item: OkrWorkItem;
  directory: OkrDirectoryPerson[];
  viewer: OkrDirectoryPerson | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<KrDetailTab>("info");
  const accountable = accountablePeople(item, directory);
  const accountableLabel = accountable.map((person) => person.name).join(", ");
  const statusTone = okrStatusTone(item.status);
  const percent =
    item.progressPercent != null ? Math.round(item.progressPercent) : null;
  const subtitle =
    item.description.trim() && item.description.trim() !== item.shortTitle.trim()
      ? item.description
      : formatOkrMeasure(item.targetValue, item.unit)
        ? `Target ${formatOkrMeasure(item.targetValue, item.unit)}`
        : "";
  const activityCount = item.lastCheckIn ? 1 : 0;

  return (
    <aside className="pd-okr-kr-detail" aria-label="Key result details">
      <header className="pd-okr-kr-detail__header">
        <div className="pd-okr-kr-detail__nav">
          <button
            type="button"
            className="pd-okr-kr-detail__back"
            onClick={onClose}
          >
            <span className="pd-okr-kr-detail__icon-btn" aria-hidden>
              <ArrowLeft size={16} strokeWidth={2} />
            </span>
            Back to All
          </button>
          <Button
            type="button"
            size="sm"
            pill
            className="pd-okr-kr-detail__apply"
            onClick={() => requestApplyOkrToGoal(okrGoalDropPayload(item))}
          >
            <ClipboardPaste size={14} strokeWidth={2.25} aria-hidden />
            Apply to goal
          </Button>
        </div>

        <div className="pd-okr-kr-detail__hero-shell pd-okr-kr-detail__surface-wash">
          <div className="pd-okr-kr-detail__hero-inner">
            <div className="pd-okr-kr-detail__hero-grid">
              <ProgressRing percent={percent} tone={statusTone} />

              <div className="pd-okr-kr-detail__hero-copy">
                <p className="pd-okr-kr-detail__hero-title" title={item.shortTitle}>
                  {item.shortTitle}
                </p>
                {subtitle ? (
                  <p className="pd-okr-kr-detail__hero-sub" title={subtitle}>
                    {subtitle}
                  </p>
                ) : null}
                <div className="pd-okr-kr-detail__chips">
                  {item.tierLabel ? (
                    <span className="pd-okr-kr-detail__chip pd-okr-kr-detail__chip--tier">
                      {item.tierLabel}
                    </span>
                  ) : null}
                  {item.statusLabel ? (
                    <StatusChip label={item.statusLabel} tone={statusTone} />
                  ) : null}
                </div>
                {accountable.length > 0 ? (
                  <div
                    className="pd-okr-kr-detail__owner-pill"
                    title={accountableLabel}
                  >
                    <span
                      className="pd-okr-kr-detail__owner-avatars"
                      aria-hidden={accountable.length > 1}
                    >
                      {accountable.slice(0, 3).map((person, index) => (
                        <Avatar
                          key={`${person.employeeId ?? person.name}-${index}`}
                          name={person.name}
                          src={person.avatarUrl || undefined}
                          size="sm"
                          className="pd-okr-kr-detail__owner-avatar"
                          alt={accountable.length === 1 ? person.name : ""}
                          style={avatarStyle(person.name)}
                        />
                      ))}
                    </span>
                    <span>{accountableLabel}</span>
                  </div>
                ) : null}
              </div>

              <div
                className="pd-okr-kr-detail__toolbar"
                role="toolbar"
                aria-label="Key result panel actions"
              >
                <a
                  className="pd-okr-kr-detail__icon-btn"
                  href={okrWorkItemPlatformUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in OKRs"
                  title="Open in OKRs"
                >
                  <ExternalLink size={16} strokeWidth={2} aria-hidden />
                </a>
                <button
                  type="button"
                  className="pd-okr-kr-detail__icon-btn"
                  aria-label="Close"
                  title="Close"
                  onClick={onClose}
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pd-okr-kr-detail__tabs-wrap">
          <SegmentedControl
            className="pd-okr-kr-detail__tabs"
            aria-label="Key result panel"
            value={tab}
            onChange={setTab}
            options={[
              { id: "info", label: "Info" },
              {
                id: "activity",
                label: (
                  <>
                    Activity
                    {activityCount > 0 ? (
                      <span className="pd-okr-kr-detail__tab-badge">
                        {activityCount}
                      </span>
                    ) : null}
                  </>
                ),
              },
            ]}
          />
        </div>
      </header>

      <div className="pd-okr-kr-detail__body">
        <div
          className={`pd-okr-kr-detail__tabpanel${tab === "info" ? " is-on" : ""}`}
          hidden={tab !== "info"}
        >
          <KrInfoTab item={item} directory={directory} />
        </div>
        <div
          className={`pd-okr-kr-detail__tabpanel${tab === "activity" ? " is-on" : ""}`}
          hidden={tab !== "activity"}
        >
          <KrActivityTab item={item} />
        </div>
      </div>
    </aside>
  );
}
