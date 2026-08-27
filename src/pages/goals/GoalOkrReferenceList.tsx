import {
  useMemo,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Search } from "lucide-react";
import { Avatar, Tooltip } from "@/components/ui";
import { ApiError } from "@/lib/apiClient";
import { avatarStyle } from "@/lib/employees/avatar";
import { useEmployees } from "@/lib/employees/useEmployees";
import { fetchEmployeeOkrs } from "@/lib/okr/performance";
import { queryKeys } from "@/lib/queryClient";
import {
  formatOkrMeasure,
  formatOkrRole,
  okrStatusTone,
  raciSearchText,
  resolveRaciParty,
  type OkrDirectoryPerson,
  type OkrRaci,
  type OkrRaciParty,
  type OkrReferenceScope,
  type OkrWindowData,
  type OkrWorkItem,
  type ResolvedOkrRaciParty,
} from "@/lib/okr/reference";

const RACI_ROWS = [
  { key: "accountable", letter: "A", label: "Accountable" },
  { key: "responsible", letter: "R", label: "Responsible" },
  { key: "consulted", letter: "C", label: "Consulted" },
  { key: "informed", letter: "I", label: "Informed" },
] as const;

function matchesQuery(
  item: OkrWorkItem,
  query: string,
  directoryNames: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    item.title,
    item.description,
    item.objectiveTitle,
    item.ownerLabel,
    item.statusLabel,
    item.quarterLabel,
    ...item.roles,
    raciSearchText(item.raci),
    directoryNames,
    item.lastCheckIn?.note ?? "",
    item.lastCheckIn?.authorName ?? "",
    ...item.milestones.map((milestone) => milestone.title),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function directoryForRaci(
  raci: OkrRaci,
  directory: OkrDirectoryPerson[],
): string {
  return RACI_ROWS.flatMap((row) =>
    raci[row.key].map((party) => resolveRaciParty(party, directory).name),
  ).join(" ");
}

function formatCheckInDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function progressLine(item: OkrWorkItem): string | null {
  const current = formatOkrMeasure(item.currentValue, item.unit);
  const target = formatOkrMeasure(item.targetValue, item.unit);
  if (current && target) return `${current} → ${target}`;
  if (item.progressPercent != null) return `${Math.round(item.progressPercent)}%`;
  return current ?? target;
}

function clusterByObjective(items: OkrWorkItem[]) {
  const clusters: { key: string; objective: string; items: OkrWorkItem[] }[] =
    [];
  for (const item of items) {
    const objective = item.objectiveTitle.trim();
    const key = objective || `item:${item.id}`;
    const existing = clusters.find((cluster) => cluster.key === key);
    if (existing) existing.items.push(item);
    else clusters.push({ key, objective, items: [item] });
  }
  return clusters;
}

function RaciPerson({ person }: { person: ResolvedOkrRaciParty }) {
  const inner = (
    <>
      <Avatar
        name={person.name}
        src={person.avatarUrl || undefined}
        size="sm"
        className="pd-okr-ref__raci-avatar"
        alt=""
        style={avatarStyle(person.name)}
      />
      <span className="pd-okr-ref__raci-name">{person.name}</span>
    </>
  );

  if (person.linked && person.employeeId != null) {
    return (
      <Link to={`/people/${person.employeeId}`} className="pd-okr-ref__raci-person">
        {inner}
      </Link>
    );
  }

  return <span className="pd-okr-ref__raci-person">{inner}</span>;
}

function OkrRaciList({
  raci,
  directory,
}: {
  raci: OkrRaci;
  directory: OkrDirectoryPerson[];
}) {
  const rows = RACI_ROWS.filter((row) => raci[row.key].length > 0);
  if (rows.length === 0) return null;

  return (
    <div className="pd-okr-ref__raci">
      <p className="pd-okr-ref__raci-title">RACI</p>
      {rows.map((row) => (
        <section
          key={row.key}
          className={`pd-okr-ref__raci-row pd-okr-ref__raci-row--${row.letter.toLowerCase()}`}
          aria-label={`${row.label}, ${raci[row.key].length}`}
        >
          <h4>
            {row.letter} · {row.label}
            <span>{raci[row.key].length}</span>
          </h4>
          <ul>
            {raci[row.key].map((party: OkrRaciParty, index) => {
              const person = resolveRaciParty(party, directory);
              return (
                <li key={`${row.key}-${person.employeeId ?? person.name}-${index}`}>
                  <RaciPerson person={person} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function stopSummaryToggle(
  event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>,
) {
  event.preventDefault();
  event.stopPropagation();
}

function OkrRaciTip({
  raci,
  directory,
}: {
  raci: OkrRaci;
  directory: OkrDirectoryPerson[];
}) {
  if (RACI_ROWS.every((row) => raci[row.key].length === 0)) return null;

  return (
    <Tooltip
      side="left"
      portal
      interactive
      delayMs={80}
      content={<OkrRaciList raci={raci} directory={directory} />}
    >
      <button
        type="button"
        className="pd-okr-ref__raci-trigger"
        aria-label="RACI"
        onClick={stopSummaryToggle}
        onPointerDown={stopSummaryToggle}
      >
        RACI
      </button>
    </Tooltip>
  );
}

function CopyOkrTitle({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const copyTitle = async (
    event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="pd-okr-ref__copy"
      onClick={(event) => void copyTitle(event)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      aria-label={copied ? "Copied" : `Copy ${title}`}
      title={copied ? "Copied" : "Copy title"}
    >
      {copied ? (
        <Check size={13} strokeWidth={2.25} aria-hidden />
      ) : (
        <Copy size={13} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}

function WorkItem({
  item,
  directory,
}: {
  item: OkrWorkItem;
  directory: OkrDirectoryPerson[];
}) {
  const tone = okrStatusTone(item.status);
  const role = item.roles.map(formatOkrRole).join(", ");
  const checkIn = item.lastCheckIn;
  const measure = progressLine(item);

  return (
    <details className="pd-okr-ref__item">
      <summary>
        <span className="pd-okr-ref__item-copy">
          <span className="pd-okr-ref__title">
            <strong>{item.shortTitle}</strong>
            <CopyOkrTitle title={item.shortTitle} />
          </span>
          {item.description ? (
            <small className="pd-okr-ref__desc">{item.description}</small>
          ) : null}
          <span className="pd-okr-ref__meta">
            {role ? <span className="pd-okr-ref__role">{role}</span> : null}
            {item.statusLabel ? (
              <span
                className={`pd-okr-ref__status pd-okr-ref__status--${tone}`}
              >
                {item.statusLabel}
              </span>
            ) : null}
            {measure ? (
              <span className="pd-okr-ref__measure">{measure}</span>
            ) : null}
            <OkrRaciTip raci={item.raci} directory={directory} />
          </span>
        </span>
        <ChevronDown
          className="pd-okr-ref__item-chevron"
          size={15}
          strokeWidth={2.25}
          aria-hidden
        />
      </summary>
      <div className="pd-okr-ref__item-body">
        {checkIn ? (
          <p>
            Last check-in
            {checkIn.weekNumber != null ? ` · Week ${checkIn.weekNumber}` : ""}
            {checkIn.statusLabel ? ` · ${checkIn.statusLabel}` : ""}
            {checkIn.authorName ? ` · ${checkIn.authorName}` : ""}
            {checkIn.submittedAt
              ? ` · ${formatCheckInDate(checkIn.submittedAt)}`
              : ""}
            {checkIn.note ? ` — ${checkIn.note}` : ""}
          </p>
        ) : (
          <p>No check-in yet.</p>
        )}
        {item.milestones.length > 0 ? (
          <ul>
            {item.milestones.map((milestone) => (
              <li key={milestone.id}>
                {milestone.title}
                {milestone.status ? ` · ${formatOkrRole(milestone.status)}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

function ObjectiveCluster({
  objective,
  items,
  directory,
}: {
  objective: string;
  items: OkrWorkItem[];
  directory: OkrDirectoryPerson[];
}) {
  return (
    <div className="pd-okr-ref__cluster">
      {objective ? (
        <p className="pd-okr-ref__obj">
          <span>OBJ</span>
          {objective}
        </p>
      ) : null}
      <div className="pd-okr-ref__list">
        {items.map((item) => (
          <WorkItem key={item.id} item={item} directory={directory} />
        ))}
      </div>
    </div>
  );
}

function KindGroup({
  title,
  items,
  directory,
}: {
  title: string;
  items: OkrWorkItem[];
  directory: OkrDirectoryPerson[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="pd-okr-ref__group" aria-label={title}>
      <div className="pd-okr-ref__group-head">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {clusterByObjective(items).map((cluster) => (
        <ObjectiveCluster
          key={cluster.key}
          objective={cluster.objective}
          items={cluster.items}
          directory={directory}
        />
      ))}
    </section>
  );
}

function emptyCopy(window: OkrWindowData | undefined, query: string): string {
  if (query.trim()) return "No matching OKRs.";
  if (window && window.total === 0) {
    return window.allQuarters
      ? "No key results or special projects."
      : `No key results or special projects${window.quarterLabel ? ` for ${window.quarterLabel}` : ""}.`;
  }
  return "No matching OKRs.";
}

/** Searchable key results and special projects for one employee. */
export function GoalOkrReferenceList({
  employeeId,
  quarter,
  window: windowProp,
}: {
  employeeId?: number;
  quarter?: string;
  scope?: OkrReferenceScope;
  window?: OkrWindowData;
}) {
  const [query, setQuery] = useState("");
  const lookupId = employeeId && employeeId > 0 ? employeeId : 0;
  const { employees } = useEmployees();
  const directory = employees;
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.employeeOkrs(lookupId, quarter),
    queryFn: () => fetchEmployeeOkrs({ employeeId: lookupId, quarter }),
    enabled: windowProp == null && lookupId > 0,
  });
  const window = windowProp ?? data;
  const items = window?.items ?? [];
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        matchesQuery(item, query, directoryForRaci(item.raci, directory)),
      ),
    [directory, items, query],
  );
  const keyResults = filtered.filter((item) => item.kind === "key_result");
  const specialProjects = filtered.filter(
    (item) => item.kind === "special_project",
  );
  const quarterGroups = window?.allQuarters
    ? [...new Set(filtered.map((item) => item.quarterLabel || item.quarter))]
    : [];

  if (windowProp == null && lookupId <= 0) {
    return <p className="pd-okr-ref__empty">No matching OKRs.</p>;
  }

  if (windowProp == null && isPending) {
    return <p className="pd-okr-ref__empty">Loading OKRs…</p>;
  }

  if (windowProp == null && isError) {
    const message =
      error instanceof ApiError ? error.message : "Could not load OKRs.";
    return <p className="pd-okr-ref__empty">{message}</p>;
  }

  return (
    <div className="pd-okr-ref__content">
      <label className="pd-okr-ref__search">
        <span className="pd-sr-only">Search reference OKRs</span>
        <Search size={14} strokeWidth={2} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="Search OKRs"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {filtered.length > 0 ? (
        quarterGroups.length > 0 ? (
          quarterGroups.map((label) => {
            const quarterItems = filtered.filter(
              (item) => (item.quarterLabel || item.quarter) === label,
            );
            return (
              <section key={label} className="pd-okr-ref__group" aria-label={label}>
                <div className="pd-okr-ref__group-head">
                  <h3>{label}</h3>
                  <span>{quarterItems.length}</span>
                </div>
                <KindGroup
                  title="Key results"
                  items={quarterItems.filter((item) => item.kind === "key_result")}
                  directory={directory}
                />
                <KindGroup
                  title="Special projects"
                  items={quarterItems.filter(
                    (item) => item.kind === "special_project",
                  )}
                  directory={directory}
                />
              </section>
            );
          })
        ) : (
          <>
            <KindGroup
              title="Key results"
              items={keyResults}
              directory={directory}
            />
            <KindGroup
              title="Special projects"
              items={specialProjects}
              directory={directory}
            />
          </>
        )
      ) : (
        <p className="pd-okr-ref__empty">{emptyCopy(window, query)}</p>
      )}
    </div>
  );
}
