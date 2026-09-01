export const COMPANY_OKR_NAME = "FundedNext";
export const OKR_PLATFORM_ORIGIN =
  import.meta.env.VITE_OKR_PLATFORM_URL?.trim().replace(/\/$/, "") ||
  "https://okr.nextventures.io";

export type OkrReferenceLevel = "company" | "department" | "wing";

export type OkrReferenceScope = {
  department: string;
  wing: string;
};

export type OkrRaciParty = {
  employeeId: number | null;
  email: string;
  label: string;
};

export type OkrRaci = {
  responsible: OkrRaciParty[];
  accountable: OkrRaciParty[];
  consulted: OkrRaciParty[];
  informed: OkrRaciParty[];
};

export type OkrDirectoryPerson = {
  employeeId: number;
  fullName: string;
  email: string;
  avatarUrl: string;
};

export type ResolvedOkrRaciParty = {
  employeeId: number | null;
  name: string;
  avatarUrl: string;
  linked: boolean;
};

export type OkrLastCheckIn = {
  weekNumber: number | null;
  statusLabel: string;
  note: string | null;
  submittedAt: string | null;
  authorName: string | null;
};

export type OkrMilestone = {
  id: string;
  title: string;
  status: string;
  weight: number;
};

export type OkrWorkKind = "key_result" | "special_project";

export type OkrWorkItem = {
  id: string;
  keyResultId: string;
  objectiveId: string;
  kind: OkrWorkKind;
  level: OkrReferenceLevel;
  quarter: string;
  quarterLabel: string;
  title: string;
  shortTitle: string;
  description: string;
  objectiveTitle: string;
  ownerLabel: string;
  status: string;
  statusLabel: string;
  roles: string[];
  unit: string;
  currentValue: number | null;
  targetValue: number | null;
  progressPercent: number | null;
  lastCheckIn: OkrLastCheckIn | null;
  raci: OkrRaci;
  milestones: OkrMilestone[];
  tierLabel: string;
};

export type OkrWindowData = {
  employeeName: string;
  quarterLabel: string | null;
  allQuarters: boolean;
  total: number;
  items: OkrWorkItem[];
};

type OkrPersonLike = {
  kind?: string;
  name?: string;
  displayName?: string;
  label?: string;
  email?: string;
  employeeId?: number | string | null;
};

type OkrRaciLike = {
  accountable?: OkrPersonLike[];
  responsible?: OkrPersonLike[];
  consulted?: OkrPersonLike[];
  informed?: OkrPersonLike[];
};

type OkrCheckInLike = {
  weekNumber?: number | null;
  statusLabel?: string;
  note?: string | null;
  submittedAt?: string | null;
  author?: OkrPersonLike | null;
};

type OkrMilestoneLike = {
  id?: string;
  title?: string;
  status?: string;
  weight?: number;
};

type OkrItemLike = {
  id?: string;
  title?: string;
  longTitle?: string;
  shortTitle?: string;
  tier?: string;
  status?: string;
  statusLabel?: string;
  roles?: string[];
  unit?: string;
  currentValue?: number | null;
  targetValue?: number | null;
  progressPercent?: number | null;
  raci?: OkrRaciLike;
  lastCheckIn?: OkrCheckInLike | null;
  objective?: {
    id?: string;
    title?: string;
    longTitle?: string;
    shortTitle?: string;
    owner?: OkrPersonLike | null;
  } | null;
  owner?: OkrPersonLike | null;
  milestones?: OkrMilestoneLike[];
};

type OkrQuarterLike = {
  name?: string;
  quarter?: string;
  keyResults?: OkrItemLike[];
  specialProjects?: OkrItemLike[];
};

export type OkrEmployeePayload = {
  employee?: {
    displayName?: string;
    email?: string;
  } | null;
  filter?: {
    quarter?: string;
    allQuarters?: boolean;
  } | null;
  quarters?: OkrQuarterLike[];
};

export function partyLabel(party: OkrPersonLike | null | undefined): string {
  if (!party) return "";
  if (party.kind === "label" && party.label?.trim()) return party.label.trim();
  return (
    party.displayName?.trim() ||
    party.name?.trim() ||
    party.label?.trim() ||
    ""
  );
}

/** Strip an optional NXT prefix and keep a positive HR employee id. */
export function okrHrEmployeeId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim().replace(/^NXT/i, "");
  const employeeId = Number(raw);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return null;
  return employeeId;
}

export function mapRaciParties(
  parties: OkrPersonLike[] | undefined,
): OkrRaciParty[] {
  return (parties ?? [])
    .map((party) => ({
      employeeId: okrHrEmployeeId(party.employeeId),
      email: party.email?.trim() ?? "",
      label: partyLabel(party),
    }))
    .filter((party) => party.employeeId != null || party.label);
}

export function raciSearchText(raci: OkrRaci): string {
  return [
    ...raci.accountable,
    ...raci.responsible,
    ...raci.consulted,
    ...raci.informed,
  ]
    .flatMap((party) => [party.label, party.email])
    .filter(Boolean)
    .join(" ");
}

/** Prefer the directory name for a RACI person once their HR id matches. */
export function resolveRaciParty(
  party: OkrRaciParty,
  directory: OkrDirectoryPerson[],
): ResolvedOkrRaciParty {
  const byId =
    party.employeeId != null
      ? directory.find((person) => person.employeeId === party.employeeId)
      : undefined;
  const email = party.email.trim().toLowerCase();
  const byEmail =
    !byId && email
      ? directory.find((person) => person.email.trim().toLowerCase() === email)
      : undefined;
  const match = byId ?? byEmail;
  if (match) {
    return {
      employeeId: match.employeeId,
      name: match.fullName,
      avatarUrl: match.avatarUrl,
      linked: true,
    };
  }
  return {
    employeeId: party.employeeId,
    name: party.label,
    avatarUrl: "",
    linked: false,
  };
}

export function formatOkrTierLabel(tier?: string): string {
  const value = tier?.trim().toLowerCase() ?? "";
  const numbered = value.match(/^t(\d+)/);
  if (numbered) return `T${numbered[1]}`;
  if (value.includes("company")) return "T1";
  if (value.includes("department")) return "T2";
  if (value.includes("wing")) return "T4";
  return "";
}

export function levelFromTier(tier?: string): OkrReferenceLevel {
  const value = tier?.trim().toLowerCase() ?? "";
  if (value.includes("company") || value.startsWith("t1")) return "company";
  if (value.includes("wing") || value.startsWith("t4")) return "wing";
  return "department";
}

/** Parse OKR quarter labels like `2026-Q3` or `Q3 2026`. */
export function parseOkrYearQuarter(
  value: string,
): { year: string; quarter: string } | null {
  const iso = value.trim().match(/^(\d{4})-Q([1-4])$/i);
  if (iso) return { year: iso[1], quarter: iso[2] };
  const label = value.trim().match(/^Q([1-4])\s+(\d{4})$/i);
  if (label) return { year: label[2], quarter: label[1] };
  return null;
}

/** Open the OKR platform workspace for one reference work item. */
export function okrWorkItemPlatformUrl(item: OkrWorkItem): string {
  const url = new URL(`/${item.level}/workspace`, OKR_PLATFORM_ORIGIN);
  if (item.objectiveId) url.searchParams.set("objectiveId", item.objectiveId);
  url.searchParams.set("keyResultId", item.keyResultId);
  const period =
    parseOkrYearQuarter(item.quarter) ?? parseOkrYearQuarter(item.quarterLabel);
  if (period) {
    url.searchParams.set("year", period.year);
    url.searchParams.set("quarter", period.quarter);
  }
  return url.toString();
}

export function formatOkrMeasure(
  value: number | null,
  unit: string,
): string | null {
  if (value == null) return null;
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (unit === "%") return `${rounded}%`;
  if (unit) return `${rounded} ${unit}`;
  return rounded;
}

export function formatOkrRole(role: string): string {
  return role
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type OkrTrackingKind = "milestone" | "numeric";

export function okrTrackingKind(item: {
  milestones: Array<{ title: string }>;
}): OkrTrackingKind {
  return item.milestones.some((milestone) => milestone.title.trim())
    ? "milestone"
    : "numeric";
}

export function formatOkrTrackingKind(kind: OkrTrackingKind): string {
  return kind === "milestone" ? "Milestone" : "Numeric";
}

export function okrStatusTone(
  status?: string,
): "ok" | "warn" | "danger" | "muted" {
  const value = status?.trim().toLowerCase() ?? "";
  if (
    value === "on_track" ||
    value === "done" ||
    value === "completed" ||
    value === "complete"
  ) {
    return "ok";
  }
  if (value === "at_risk") return "warn";
  if (value === "behind" || value === "blocked") return "danger";
  return "muted";
}

function mapCheckIn(
  checkIn: OkrCheckInLike | null | undefined,
): OkrLastCheckIn | null {
  if (!checkIn) return null;
  const weekNumber =
    typeof checkIn.weekNumber === "number" ? checkIn.weekNumber : null;
  return {
    weekNumber,
    statusLabel: checkIn.statusLabel?.trim() || "",
    note: checkIn.note?.trim() || null,
    submittedAt: checkIn.submittedAt?.trim() || null,
    authorName: partyLabel(checkIn.author) || null,
  };
}

function mapRaci(raci: OkrRaciLike | undefined): OkrRaci {
  return {
    accountable: mapRaciParties(raci?.accountable),
    responsible: mapRaciParties(raci?.responsible),
    consulted: mapRaciParties(raci?.consulted),
    informed: mapRaciParties(raci?.informed),
  };
}

function mapWorkItem(
  item: OkrItemLike,
  kind: OkrWorkKind,
  quarter: OkrQuarterLike,
): OkrWorkItem | null {
  const id = item.id?.trim();
  const title = item.shortTitle?.trim() || item.title?.trim();
  if (!id || !title) return null;
  const quarterKey = quarter.quarter?.trim() || quarter.name?.trim() || "";
  const longTitle = item.longTitle?.trim() || item.title?.trim() || "";
  return {
    id: `${kind}:${id}`,
    keyResultId: id,
    objectiveId: item.objective?.id?.trim() || "",
    kind,
    level: levelFromTier(item.tier),
    quarter: quarterKey,
    quarterLabel: quarter.name?.trim() || quarterKey,
    title,
    shortTitle: title,
    description: longTitle && longTitle !== title ? longTitle : "",
    objectiveTitle:
      item.objective?.shortTitle?.trim() ||
      item.objective?.title?.trim() ||
      "",
    ownerLabel:
      partyLabel(item.objective?.owner) || partyLabel(item.owner) || "",
    status: item.status?.trim() || "",
    statusLabel: item.statusLabel?.trim() || item.status?.trim() || "",
    roles: Array.isArray(item.roles) ? item.roles.filter(Boolean) : [],
    unit: item.unit?.trim() || "",
    currentValue:
      typeof item.currentValue === "number" ? item.currentValue : null,
    targetValue:
      typeof item.targetValue === "number" ? item.targetValue : null,
    progressPercent:
      typeof item.progressPercent === "number" ? item.progressPercent : null,
    lastCheckIn: mapCheckIn(item.lastCheckIn),
    raci: mapRaci(item.raci),
    milestones: (item.milestones ?? [])
      .map((milestone, index) => {
        const milestoneId = milestone.id?.trim() || `${id}-ms-${index}`;
        const milestoneTitle = milestone.title?.trim();
        if (!milestoneTitle) return null;
        return {
          id: milestoneId,
          title: milestoneTitle,
          status: milestone.status?.trim() || "",
          weight: typeof milestone.weight === "number" ? milestone.weight : 0,
        };
      })
      .filter((milestone): milestone is OkrMilestone => milestone !== null),
    tierLabel: formatOkrTierLabel(item.tier),
  };
}

/** Flatten KRs and special projects into one window work list. */
export function mapEmployeeOkrPayload(
  payload: OkrEmployeePayload,
): OkrWindowData {
  const items = (payload.quarters ?? []).flatMap((quarter) => [
    ...(quarter.keyResults ?? []).flatMap((item) => {
      const mapped = mapWorkItem(item, "key_result", quarter);
      return mapped ? [mapped] : [];
    }),
    ...(quarter.specialProjects ?? []).flatMap((item) => {
      const mapped = mapWorkItem(item, "special_project", quarter);
      return mapped ? [mapped] : [];
    }),
  ]);

  const filterQuarter = payload.filter?.quarter?.trim() || null;
  return {
    employeeName: payload.employee?.displayName?.trim() || "",
    quarterLabel:
      filterQuarter ||
      items[0]?.quarterLabel ||
      payload.quarters?.[0]?.name?.trim() ||
      null,
    allQuarters: payload.filter?.allQuarters === true,
    total: items.length,
    items,
  };
}
