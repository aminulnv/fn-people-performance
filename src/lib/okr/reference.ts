import { hasSystemPermission } from "@/lib/accessControl/types";
import type { SystemPermission } from "@/lib/accessControl/types";

export const COMPANY_OKR_NAME = "FundedNext";

export type OkrReferenceLevel = "company" | "department" | "wing";

/** Who the OKR platform would show this record to. */
export type OkrReferenceAudience = "everyone" | "department" | "wing" | "admins";

export type OkrRaci = {
  responsible: string[];
  accountable: string[];
  consulted: string[];
  informed: string[];
};

export type OkrKeyResult = {
  id: string;
  text: string;
  raci: OkrRaci;
};

export type OkrReferenceScope = {
  department: string;
  wing: string;
};

export type OkrReferenceViewer = {
  department: string;
  wing: string;
  permissions?: readonly SystemPermission[];
};

export type OkrReference = {
  id: string;
  level: OkrReferenceLevel;
  audience: OkrReferenceAudience;
  title: string;
  description: string;
  ownerLabel: string;
  keyResults: OkrKeyResult[];
};

function scopeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function sameOrgUnit(left: string, right: string): boolean {
  return scopeKey(left) === scopeKey(right) && scopeKey(left) !== "";
}

function keyResult(
  id: string,
  text: string,
  raci: Partial<OkrRaci>,
): OkrKeyResult {
  return {
    id,
    text,
    raci: {
      responsible: raci.responsible ?? [],
      accountable: raci.accountable ?? [],
      consulted: raci.consulted ?? [],
      informed: raci.informed ?? [],
    },
  };
}

function hasAllRead(viewer?: OkrReferenceViewer): boolean {
  return (
    hasSystemPermission(viewer?.permissions, "platform.read_all") ||
    hasSystemPermission(viewer?.permissions, "platform.write_all")
  );
}

/**
 * Mirrors OKR-platform RBAC: if the viewer could not see the OKR there,
 * they cannot see it here either.
 */
export function canViewOkrReference(
  reference: OkrReference,
  viewer?: OkrReferenceViewer,
  scope?: OkrReferenceScope,
): boolean {
  if (!viewer) return true;
  if (hasAllRead(viewer)) return true;
  if (reference.audience === "admins") return false;
  if (reference.audience === "everyone" || reference.level === "company") {
    return true;
  }

  const department = scope?.department ?? "";
  if (
    reference.audience === "department" ||
    reference.audience === "wing" ||
    reference.level === "department" ||
    reference.level === "wing"
  ) {
    return sameOrgUnit(viewer.department, department);
  }
  return false;
}

export function listVisibleOkrReferences(
  scope: OkrReferenceScope,
  viewer?: OkrReferenceViewer,
): OkrReference[] {
  return listOkrReferences(scope).filter((reference) =>
    canViewOkrReference(reference, viewer, scope),
  );
}

/**
 * Temporary local feed for the read-only OKR surface. The UI depends only on
 * this contract, so the separate OKR platform API can replace this source
 * without changing goal storage or goal components.
 */
export function listOkrReferences(scope: OkrReferenceScope): OkrReference[] {
  const department = scope.department.trim();
  const wing = scope.wing.trim();

  const references: OkrReference[] = [
    {
      id: "company-customer-trust",
      level: "company",
      audience: "everyone",
      title: `Strengthen customer trust across ${COMPANY_OKR_NAME}`,
      description:
        "Keep company-wide customer outcomes visible so team goals stay aligned with what FundedNext ships to clients.",
      ownerLabel: `${COMPANY_OKR_NAME} leadership`,
      keyResults: [
        keyResult("company-nps", "Raise the company customer-trust score", {
          responsible: ["Customer Experience"],
          accountable: ["CEO office"],
          consulted: ["Product", "Support"],
          informed: ["All departments"],
        }),
        keyResult(
          "company-reliability",
          "Keep platform reliability above the company target",
          {
            responsible: ["Platform reliability"],
            accountable: ["CTO"],
            consulted: ["Engineering"],
            informed: ["All departments"],
          },
        ),
      ],
    },
    {
      id: "company-operating-rhythm",
      level: "company",
      audience: "everyone",
      title: `Tighten the ${COMPANY_OKR_NAME} operating rhythm`,
      description:
        "Make quarterly priorities, owners, and progress reviewable in one place across the company.",
      ownerLabel: `${COMPANY_OKR_NAME} leadership`,
      keyResults: [
        keyResult(
          "company-priorities",
          "Publish one company priority list before each quarter",
          {
            responsible: ["PTR"],
            accountable: ["COO"],
            consulted: ["Department heads"],
            informed: ["All employees"],
          },
        ),
        keyResult(
          "company-reviews",
          "Complete leadership reviews on the published cadence",
          {
            responsible: ["Department heads"],
            accountable: ["COO"],
            consulted: ["PTR"],
            informed: ["SLT"],
          },
        ),
      ],
    },
    {
      id: "company-capital-plan",
      level: "company",
      audience: "admins",
      title: "Board capital allocation (leadership only)",
      description:
        "Confidential company capital plan. Hidden from anyone who cannot see it on the OKR platform.",
      ownerLabel: `${COMPANY_OKR_NAME} board`,
      keyResults: [
        keyResult("company-capital", "Lock the quarterly capital envelope", {
          responsible: ["Finance"],
          accountable: ["CFO"],
          consulted: ["CEO office"],
          informed: ["Board"],
        }),
      ],
    },
  ];

  if (!department) return references;

  const departmentKey = scopeKey(department);
  references.push(
    {
      id: `${departmentKey}-customer-outcomes`,
      level: "department",
      audience: "department",
      title: `Improve customer outcomes across ${department}`,
      description:
        "Focus the department on measurable customer value, faster feedback loops, and clearer ownership of outcomes.",
      ownerLabel: `${department} leadership`,
      keyResults: [
        keyResult(
          `${departmentKey}-outcome`,
          "Improve the department’s primary customer outcome metric",
          {
            responsible: [`${department} squad leads`],
            accountable: [`${department} head`],
            consulted: ["Customer Experience"],
            informed: [`${department} department`],
          },
        ),
        keyResult(
          `${departmentKey}-feedback`,
          "Shorten the time from insight to delivered improvement",
          {
            responsible: [`${department} delivery`],
            accountable: [`${department} head`],
            consulted: ["Product"],
            informed: [`${department} department`],
          },
        ),
      ],
    },
    {
      id: `${departmentKey}-operating-quality`,
      level: "department",
      audience: "department",
      title: `Raise operating quality in ${department}`,
      description:
        "Make delivery more predictable while reducing avoidable rework and operational risk.",
      ownerLabel: `${department} leadership`,
      keyResults: [
        keyResult(
          `${departmentKey}-ontime`,
          "Increase on-time delivery of committed priorities",
          {
            responsible: [`${department} delivery`],
            accountable: [`${department} head`],
            consulted: ["PMO"],
            informed: [`${department} department`],
          },
        ),
        keyResult(
          `${departmentKey}-rework`,
          "Reduce repeat issues caused by process gaps",
          {
            responsible: [`${department} quality`],
            accountable: [`${department} head`],
            consulted: ["Risk"],
            informed: [`${department} department`],
          },
        ),
      ],
    },
  );

  if (!wing) return references;

  const wingKey = scopeKey(wing);
  return [
    ...references,
    {
      id: `${departmentKey}-${wingKey}-delivery`,
      level: "wing",
      audience: "wing",
      title: `Deliver ${wing} priorities predictably`,
      description:
        "Translate department outcomes into a focused wing plan with explicit metrics and dependable execution.",
      ownerLabel: `${wing} wing`,
      keyResults: [
        keyResult(
          `${wingKey}-commitments`,
          "Deliver the wing’s committed quarterly priorities",
          {
            responsible: [`${wing} leads`],
            accountable: [`${wing} owner`],
            consulted: [`${department} head`],
            informed: [`${wing} wing`],
          },
        ),
        keyResult(
          `${wingKey}-dependencies`,
          "Keep dependencies and delivery risks visible",
          {
            responsible: [`${wing} delivery`],
            accountable: [`${wing} owner`],
            consulted: ["PMO"],
            informed: [`${department} department`],
          },
        ),
      ],
    },
    {
      id: `${departmentKey}-${wingKey}-capability`,
      level: "wing",
      audience: "wing",
      title: `Strengthen capability across ${wing}`,
      description:
        "Build the processes, skills, and shared standards needed for the wing to sustain stronger performance.",
      ownerLabel: `${wing} wing`,
      keyResults: [
        keyResult(
          `${wingKey}-standard`,
          "Adopt one shared quality standard across the wing",
          {
            responsible: [`${wing} quality`],
            accountable: [`${wing} owner`],
            consulted: [`${department} quality`],
            informed: [`${wing} wing`],
          },
        ),
        keyResult(
          `${wingKey}-gaps`,
          "Close the highest-priority capability gaps",
          {
            responsible: [`${wing} leads`],
            accountable: [`${wing} owner`],
            consulted: ["People"],
            informed: [`${wing} wing`],
          },
        ),
      ],
    },
  ];
}
