import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Network, Search } from "lucide-react";
import {
  listOkrReferences,
  type OkrReference,
  type OkrReferenceScope,
} from "@/lib/okr/reference";

function matchesQuery(reference: OkrReference, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    reference.title,
    reference.description,
    reference.ownerLabel,
    ...reference.keyResults,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function ReferenceGroup({
  title,
  icon,
  references,
}: {
  title: string;
  icon: "department" | "wing";
  references: OkrReference[];
}) {
  if (references.length === 0) return null;
  const Icon = icon === "department" ? Building2 : Network;

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
              <p className="pd-okr-ref__kr-label">Key results</p>
              <ul>
                {reference.keyResults.map((result) => (
                  <li key={result}>{result}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Searchable, read-only department and wing OKRs for one employee. */
export function GoalOkrReferenceList({ scope }: { scope: OkrReferenceScope }) {
  const [query, setQuery] = useState("");
  const references = useMemo(() => listOkrReferences(scope), [scope]);
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
            title={`${scope.department} department`}
            icon="department"
            references={filtered.filter(
              (reference) => reference.level === "department",
            )}
          />
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
