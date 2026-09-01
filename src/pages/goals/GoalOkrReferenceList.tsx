import {
  useMemo,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Search,
} from "lucide-react";
import { Avatar, SegmentedControl } from "@/components/ui";
import { ApiError } from "@/lib/apiClient";
import { avatarStyle } from "@/lib/employees/avatar";
import { useEmployees } from "@/lib/employees/useEmployees";
import {
  OKR_GOAL_DRAG_TYPE,
  okrGoalDropPayload,
} from "@/lib/okr/applyToGoal";
import { fetchEmployeeOkrs } from "@/lib/okr/performance";
import { queryKeys } from "@/lib/queryClient";
import {
  formatOkrMeasure,
  formatOkrTrackingKind,
  okrTrackingKind,
  raciSearchText,
  resolveRaciParty,
  type OkrDirectoryPerson,
  type OkrRaci,
  type OkrReferenceLevel,
  type OkrReferenceScope,
  type OkrWindowData,
  type OkrWorkItem,
  type ResolvedOkrRaciParty,
} from "@/lib/okr/reference";
import { GoalOkrKrDetail } from "./GoalOkrKrDetail";

type OkrLevelTab = OkrReferenceLevel | "all";

const LEVEL_TABS = [
  { id: "company", label: "Company" },
  { id: "department", label: "Department" },
  { id: "wing", label: "Wings" },
  { id: "all", label: "All" },
] as const satisfies ReadonlyArray<{
  id: OkrLevelTab;
  label: string;
}>;

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
    formatOkrTrackingKind(okrTrackingKind(item)),
    ...item.roles,
    raciSearchText(item.raci),
    directoryNames,
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

function progressLine(item: OkrWorkItem): string | null {
  const current = formatOkrMeasure(item.currentValue, item.unit);
  const target = formatOkrMeasure(item.targetValue, item.unit);
  if (current && target) return `${current} → ${target}`;
  if (item.progressPercent != null) return `${Math.round(item.progressPercent)}%`;
  return current ?? target;
}

function progressTone(
  percent: number | null,
): "ok" | "warn" | "danger" | "muted" {
  if (percent == null) return "muted";
  if (percent < 35) return "danger";
  if (percent < 70) return "warn";
  return "ok";
}

function rowOwners(
  item: OkrWorkItem,
  directory: OkrDirectoryPerson[],
  viewer: OkrDirectoryPerson | null,
): ResolvedOkrRaciParty[] {
  const fromRaci = item.raci.responsible
    .map((party) => resolveRaciParty(party, directory))
    .filter((person) => person.name.trim());
  if (fromRaci.length > 0) return fromRaci.slice(0, 2);
  if (viewer) {
    return [
      {
        employeeId: viewer.employeeId,
        name: viewer.fullName,
        avatarUrl: viewer.avatarUrl,
        linked: true,
      },
    ];
  }
  if (item.ownerLabel.trim()) {
    return [
      {
        employeeId: null,
        name: item.ownerLabel,
        avatarUrl: "",
        linked: false,
      },
    ];
  }
  return [];
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
      title={copied ? "Copied" : "Copy Title"}
      draggable={false}
      onDragStart={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {copied ? (
        <Check size={13} strokeWidth={2.25} aria-hidden />
      ) : (
        <Copy size={13} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}

function OkrRowProgress({ item }: { item: OkrWorkItem }) {
  const current =
    formatOkrMeasure(item.currentValue, item.unit) ??
    (item.progressPercent != null
      ? `${Math.round(item.progressPercent)}%`
      : null);
  const target = formatOkrMeasure(item.targetValue, item.unit);
  const percent =
    item.progressPercent != null
      ? Math.min(100, Math.max(0, Math.round(item.progressPercent)))
      : null;
  if (!current && !target && percent == null) return null;

  const tone = progressTone(percent);
  const trail = progressLine(item);

  return (
    <div
      className={`pd-okr-ref__score pd-okr-ref__score--${tone}`}
      aria-label={trail ?? undefined}
    >
      <div className="pd-okr-ref__score-side">
        <span className="pd-okr-ref__score-value">{current ?? "—"}</span>
        {trail ? <span className="pd-okr-ref__score-trail">{trail}</span> : null}
      </div>
      <div
        className="pd-okr-ref__score-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? 0}
        aria-label="Progress"
      >
        <span
          className="pd-okr-ref__score-fill"
          style={{ height: `${percent ?? 0}%` }}
        />
      </div>
      <div className="pd-okr-ref__score-side pd-okr-ref__score-side--target">
        <span className="pd-okr-ref__score-value">{target ?? "—"}</span>
      </div>
    </div>
  );
}

function WorkItem({
  item,
  directory,
  viewer,
  selected,
  onSelect,
}: {
  item: OkrWorkItem;
  directory: OkrDirectoryPerson[];
  viewer: OkrDirectoryPerson | null;
  selected: boolean;
  onSelect: (item: OkrWorkItem) => void;
}) {
  const owners = rowOwners(item, directory, viewer);

  return (
    <div
      className={`pd-okr-ref__item${selected ? " is-selected" : ""}`}
      draggable
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          OKR_GOAL_DRAG_TYPE,
          JSON.stringify(okrGoalDropPayload(item)),
        );
        event.dataTransfer.setData("text/plain", item.shortTitle);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
        {owners.length > 0 ? (
          <div className="pd-okr-ref__avatars" aria-hidden={owners.length > 1}>
            {owners.map((person, index) => (
              <Avatar
                key={`${person.employeeId ?? person.name}-${index}`}
                name={person.name}
                src={person.avatarUrl || undefined}
                size="sm"
                className="pd-okr-ref__avatar"
                alt={owners.length === 1 ? person.name : ""}
                style={avatarStyle(person.name)}
              />
            ))}
          </div>
        ) : null}
        <div className="pd-okr-ref__item-copy">
          <span className="pd-okr-ref__title">
            <strong>{item.shortTitle}</strong>
            <CopyOkrTitle title={item.shortTitle} />
          </span>
          {item.description ? (
            <p className="pd-okr-ref__desc">{item.description}</p>
          ) : null}
        </div>
        <OkrRowProgress item={item} />
    </div>
  );
}

function ObjectiveCluster({
  objective,
  items,
  directory,
  viewer,
  open,
  onToggle,
  selectedItemId,
  onSelect,
}: {
  objective: string;
  items: OkrWorkItem[];
  directory: OkrDirectoryPerson[];
  viewer: OkrDirectoryPerson | null;
  open: boolean;
  onToggle: () => void;
  selectedItemId: string | null;
  onSelect: (item: OkrWorkItem) => void;
}) {
  const list = (
    <div className="pd-okr-ref__list">
      {items.map((item) => (
        <WorkItem
          key={item.id}
          item={item}
          directory={directory}
          viewer={viewer}
          selected={selectedItemId === item.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );

  if (!objective) {
    return <div className="pd-okr-ref__cluster">{list}</div>;
  }

  return (
    <div className="pd-okr-ref__cluster">
      <button
        type="button"
        className="pd-okr-ref__obj"
        aria-expanded={open}
        onClick={onToggle}
      >
        <ChevronDown
          className="pd-okr-ref__obj-chevron"
          size={14}
          strokeWidth={2.25}
          aria-hidden
        />
        <span>OBJ</span>
        <span className="pd-okr-ref__obj-title">{objective}</span>
      </button>
      {open ? list : null}
    </div>
  );
}

function KindGroup({
  title,
  items,
  directory,
  viewer,
  selectedItemId,
  onSelect,
}: {
  title: string;
  items: OkrWorkItem[];
  directory: OkrDirectoryPerson[];
  viewer: OkrDirectoryPerson | null;
  selectedItemId: string | null;
  onSelect: (item: OkrWorkItem) => void;
}) {
  const clusters = clusterByObjective(items);
  const expandableKeys = clusters
    .filter((cluster) => cluster.objective)
    .map((cluster) => cluster.key);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const allExpanded =
    expandableKeys.length > 0 &&
    expandableKeys.every((key) => !collapsedKeys.has(key));
  const toggleExpandAll = () => {
    setCollapsedKeys(
      allExpanded ? new Set(expandableKeys) : new Set(),
    );
  };
  const toggleCluster = (key: string) => {
    setCollapsedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (items.length === 0) return null;
  return (
    <section className="pd-okr-ref__group" aria-label={title}>
      <div className="pd-okr-ref__group-head">
        <h3>{title}</h3>
        {expandableKeys.length > 0 ? (
          <button
            type="button"
            className="pd-okr-ref__group-expand"
            aria-expanded={allExpanded}
            aria-label={allExpanded ? "Collapse all" : "Expand all"}
            title={allExpanded ? "Collapse all" : "Expand all"}
            onClick={toggleExpandAll}
          >
            {allExpanded ? (
              <ChevronsDownUp size={14} strokeWidth={1.75} aria-hidden />
            ) : (
              <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden />
            )}
          </button>
        ) : null}
        <span>{items.length}</span>
      </div>
      {clusters.map((cluster) => (
        <ObjectiveCluster
          key={cluster.key}
          objective={cluster.objective}
          items={cluster.items}
          directory={directory}
          viewer={viewer}
          open={!cluster.objective || !collapsedKeys.has(cluster.key)}
          onToggle={() => toggleCluster(cluster.key)}
          selectedItemId={selectedItemId}
          onSelect={onSelect}
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
  const [level, setLevel] = useState<OkrLevelTab>("company");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const lookupId = employeeId && employeeId > 0 ? employeeId : 0;
  const { employees } = useEmployees();
  const directory = employees;
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.employeeOkrs(lookupId, quarter),
    queryFn: () => fetchEmployeeOkrs({ employeeId: lookupId, quarter }),
    enabled: windowProp == null && lookupId > 0,
  });
  const window = windowProp ?? data;
  const viewer = useMemo(() => {
    const fromDirectory = directory.find(
      (person) => person.employeeId === lookupId,
    );
    if (fromDirectory) return fromDirectory;
    const fallbackName = window?.employeeName.trim();
    if (!fallbackName) return null;
    return {
      employeeId: lookupId,
      fullName: fallbackName,
      email: "",
      avatarUrl: "",
    };
  }, [directory, lookupId, window?.employeeName]);
  const items = window?.items ?? [];
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (level === "all" || item.level === level) &&
          matchesQuery(item, query, directoryForRaci(item.raci, directory)),
      ),
    [directory, items, level, query],
  );
  const keyResults = filtered.filter((item) => item.kind === "key_result");
  const specialProjects = filtered.filter(
    (item) => item.kind === "special_project",
  );
  const quarterGroups = window?.allQuarters
    ? [...new Set(filtered.map((item) => item.quarterLabel || item.quarter))]
    : [];
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

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
      {selectedItem ? (
        <GoalOkrKrDetail
          item={selectedItem}
          directory={directory}
          viewer={viewer}
          onClose={() => setSelectedItemId(null)}
        />
      ) : (
        <>
          <SegmentedControl
            className="pd-okr-ref__levels"
            aria-label="OKR level"
            value={level}
            onChange={setLevel}
            options={LEVEL_TABS}
          />

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
                      viewer={viewer}
                      selectedItemId={selectedItemId}
                      onSelect={(item) => setSelectedItemId(item.id)}
                    />
                    <KindGroup
                      title="Special projects"
                      items={quarterItems.filter(
                        (item) => item.kind === "special_project",
                      )}
                      directory={directory}
                      viewer={viewer}
                      selectedItemId={selectedItemId}
                      onSelect={(item) => setSelectedItemId(item.id)}
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
                  viewer={viewer}
                  selectedItemId={selectedItemId}
                  onSelect={(item) => setSelectedItemId(item.id)}
                />
                <KindGroup
                  title="Special projects"
                  items={specialProjects}
                  directory={directory}
                  viewer={viewer}
                  selectedItemId={selectedItemId}
                  onSelect={(item) => setSelectedItemId(item.id)}
                />
              </>
            )
          ) : (
            <p className="pd-okr-ref__empty">{emptyCopy(window, query)}</p>
          )}
        </>
      )}
    </div>
  );
}
