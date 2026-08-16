export type OkrReferenceScope = {
  department: string;
  wing: string;
};

export type OkrReference = {
  id: string;
  level: "department" | "wing";
  title: string;
  description: string;
  ownerLabel: string;
  keyResults: string[];
};

function scopeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Temporary local feed for the read-only OKR surface. The UI depends only on
 * this contract, so the separate OKR platform API can replace this source
 * without changing goal storage or goal components.
 */
export function listOkrReferences(
  scope: OkrReferenceScope,
): OkrReference[] {
  const department = scope.department.trim();
  const wing = scope.wing.trim();
  if (!department) return [];

  const departmentKey = scopeKey(department);
  const references: OkrReference[] = [
    {
      id: `${departmentKey}-customer-outcomes`,
      level: "department",
      title: `Improve customer outcomes across ${department}`,
      description:
        "Focus the department on measurable customer value, faster feedback loops, and clearer ownership of outcomes.",
      ownerLabel: `${department} leadership`,
      keyResults: [
        "Improve the department’s primary customer outcome metric",
        "Shorten the time from insight to delivered improvement",
      ],
    },
    {
      id: `${departmentKey}-operating-quality`,
      level: "department",
      title: `Raise operating quality in ${department}`,
      description:
        "Make delivery more predictable while reducing avoidable rework and operational risk.",
      ownerLabel: `${department} leadership`,
      keyResults: [
        "Increase on-time delivery of committed priorities",
        "Reduce repeat issues caused by process gaps",
      ],
    },
  ];

  if (!wing) return references;

  const wingKey = scopeKey(wing);
  return [
    ...references,
    {
      id: `${departmentKey}-${wingKey}-delivery`,
      level: "wing",
      title: `Deliver ${wing} priorities predictably`,
      description:
        "Translate department outcomes into a focused wing plan with explicit measures and dependable execution.",
      ownerLabel: `${wing} wing`,
      keyResults: [
        "Deliver the wing’s committed quarterly priorities",
        "Keep dependencies and delivery risks visible",
      ],
    },
    {
      id: `${departmentKey}-${wingKey}-capability`,
      level: "wing",
      title: `Strengthen capability across ${wing}`,
      description:
        "Build the processes, skills, and shared standards needed for the wing to sustain stronger performance.",
      ownerLabel: `${wing} wing`,
      keyResults: [
        "Adopt one shared quality standard across the wing",
        "Close the highest-priority capability gaps",
      ],
    },
  ];
}
