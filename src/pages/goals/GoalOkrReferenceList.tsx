import { useContext, useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Landmark, Network, Search } from "lucide-react";
import { AuthContext } from "@/lib/authContext";
import { getEmployee } from "@/lib/employees/store";
import {
  COMPANY_OKR_NAME,
  listVisibleOkrReferences,
  type OkrKeyResult,
  type OkrReference,
  type OkrReferenceLevel,
  type OkrReferenceScope,
  type OkrReferenceViewer,
} from "@/lib/okr/reference";

const RACI_COLUMNS = [
  { key: "responsible", letter: "R", label: "Responsible" },
  { key: "accountable", letter: "A", label: "Accountable" },
  { key: "consulted", letter: "C", label: "Consulted" },
  { key: "informed", letter: "I", label: "Informed" },
] as const;

function matchesQuery(reference: OkrReference, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    reference.title,
    reference.description,
    reference.ownerLabel,
    ...reference.keyResults.flatMap((result) => [
      result.text,
      ...result.raci.responsible,
      ...result.raci.accountable,
      ...result.raci.consulted,
      ...result.raci.informed,
    ]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function useOkrViewer(): OkrReferenceViewer | undefined {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const employeeId =
    typeof user?.employeeId === "number"
      ? user.employeeId
      : Number.parseInt(user?.personId ?? "", 10);
  const permissionKey = user?.permissions?.join(",") ?? "";

  return useMemo(() => {
    if (!user) return undefined;
    const employee = Number.isInteger(employeeId)
      ? getEmployee(employeeId)
      : null;
    return {
      department: employee?.department ?? "",
      wing: employee?.team ?? "",
      permissions: user.permissions,
    };
  }, [employeeId, permissionKey, user]);
}

function namesFor(
  result: OkrKeyResult,
  key: (typeof RACI_COLUMNS)[number]["key"],
): string {
  return result.raci[key].join(", ");
}

function OkrRaciMatrix({ results }: { results: OkrKeyResult[] }) {
  if (results.length === 0) return null;
  return (
    <table className="pd-okr-ref__raci">
      <caption>RACI</caption>
      <thead>
        <tr>
          <th scope="col">Key result</th>
          {RACI_COLUMNS.map((column) => (
            <th key={column.key} scope="col" title={column.label}>
              <abbr title={column.label}>{column.letter}</abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {results.map((result) => (
          <tr key={result.id}>
            <th scope="row">{result.text}</th>
            {RACI_COLUMNS.map((column) => {
              const names = namesFor(result, column.key);
              return (
                <td key={column.key} title={names || undefined}>
                  {names || "—"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReferenceGroup({
  title,
  icon,
  references,
}: {
  title: string;
  icon: OkrReferenceLevel;
  references: OkrReference[];
}) {
  if (references.length === 0) return null;
  const Icon =
    icon === "company" ? Landmark : icon === "department" ? Building2 : Network;

  return (
    <section className="pd-okr-ref__group" aria-labelledby={`okr-${icon}`}>
      <div className="pd-okr-ref__group-head">
        <Icon size={14} strokeWidth={2} aria-hidden />
        <h3 id={`okr-${icon}`}>{title}</h3>
        <span>{references.length}</span>
      </div>
      <div className="pd-okr-ref__list">
        {references.map((reference) => (
          <details key={reference.id} className="pd-okr-ref__item">
            <summary>
              <span className="pd-okr-ref__item-copy">
                <strong>{reference.title}</strong>
                <small>{reference.ownerLabel}</small>
              </span>
              <ChevronDown
                className="pd-okr-ref__item-chevron"
                size={15}
                strokeWidth={2.25}
                aria-hidden
              />
            </summary>
            <div className="pd-okr-ref__item-body">
              <p>{reference.description}</p>
              <OkrRaciMatrix results={reference.keyResults} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Searchable, read-only company, department, and wing OKRs for one employee. */
export function GoalOkrReferenceList({ scope }: { scope: OkrReferenceScope }) {
  const [query, setQuery] = useState("");
  const viewer = useOkrViewer();
  const references = useMemo(
    () => listVisibleOkrReferences(scope, viewer),
    [scope, viewer],
  );
  const filtered = useMemo(
    () => references.filter((reference) => matchesQuery(reference, query)),
    [query, references],
  );

  useEffect(() => {
    setQuery("");
  }, [scope.department, scope.wing]);

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
        <>
          <ReferenceGroup
            title={`${COMPANY_OKR_NAME} company`}
            icon="company"
            references={filtered.filter(
              (reference) => reference.level === "company",
            )}
          />
          {scope.department.trim() ? (
            <ReferenceGroup
              title={`${scope.department} department`}
              icon="department"
              references={filtered.filter(
                (reference) => reference.level === "department",
              )}
            />
          ) : null}
          {scope.wing.trim() ? (
            <ReferenceGroup
              title={`${scope.wing} wing`}
              icon="wing"
              references={filtered.filter(
                (reference) => reference.level === "wing",
              )}
            />
          ) : null}
        </>
      ) : (
        <p className="pd-okr-ref__empty">No matching OKRs.</p>
      )}
    </div>
  );
}
