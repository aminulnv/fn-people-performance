import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarClock,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Button, Input } from "@/components/ui";
import { HintIcon } from "./HintIcon";
import { addUtcDays, compareDateTime, datePart } from "@/lib/dates/timestamp";
import { formatLocalTimestamp } from "@/lib/dates/timezone";
import { avatarStyle } from "@/lib/employees/avatar";
import type { PlatformEmployee } from "@/lib/employees/types";
import { useOrganisation } from "@/lib/employees/useEmployees";
import { toIntegerId } from "@/lib/integerId";
import type { OrgDepartment, OrgTeam } from "@/lib/organisation/types";
import {
  compareByNameRelevance,
  compareGroupsByNameRelevance,
  nameRelevanceScore,
} from "@/lib/search/nameRelevance";
import type {
  GoalCycleExtension,
  GoalCycleExtensionScope,
} from "@/lib/reviews/types";

type GoalCycleExtensionsEditorProps = {
  extensions: GoalCycleExtension[];
  baseEndDate: string;
  performanceStartDate: string;
  onChange: (extensions: GoalCycleExtension[]) => void;
};

type SearchSection = "People" | "Departments" | "Teams";

type PopulationSearchResult = {
  key: string;
  section: SearchSection;
  label: string;
  description?: string;
  icon: LucideIcon;
  person?: PlatformEmployee;
  scope: GoalCycleExtensionScope;
  score: number;
};

const RESULT_LIMIT_PER_SECTION = 5;
const SEARCH_SECTIONS: SearchSection[] = ["People", "Departments", "Teams"];

function dayBefore(isoDate: string): string {
  return addUtcDays(isoDate, -1);
}

function includesQuery(values: Array<string | number>, query: string): boolean {
  return values.some((value) => String(value).toLowerCase().includes(query));
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function mergeScopeSelection(
  current: GoalCycleExtensionScope | null,
  next: GoalCycleExtensionScope,
): GoalCycleExtensionScope {
  if (next.type !== "people") return next;

  const personId = next.employeeIds[0];
  if (current?.type === "people") {
    if (current.employeeIds.includes(personId)) return current;
    return {
      type: "people",
      employeeIds: [...current.employeeIds, personId],
    };
  }

  return next;
}

function buildDepartmentScope(
  department: OrgDepartment,
  employees: ReturnType<typeof useOrganisation>["employees"],
  fallbackIds: Map<string, number>,
): GoalCycleExtensionScope {
  const member = employees.find((employee) =>
    department.memberIds.includes(employee.employeeId),
  );
  return {
    type: "department",
    departmentId:
      toIntegerId(member?.departmentId) ??
      fallbackIds.get(department.id) ??
      -1,
    departmentName: department.name,
  };
}

function buildTeamScope(
  team: OrgTeam,
  employees: ReturnType<typeof useOrganisation>["employees"],
  fallbackIds: Map<string, number>,
): GoalCycleExtensionScope {
  const member = employees.find((employee) =>
    team.memberIds.includes(employee.employeeId),
  );
  return {
    type: "team",
    teamId: toIntegerId(member?.teamId) ?? fallbackIds.get(team.id) ?? -1,
    teamName: team.name,
    departmentName: team.departmentName,
  };
}

export function GoalCycleExtensionsEditor({
  extensions,
  baseEndDate,
  performanceStartDate,
  onChange,
}: GoalCycleExtensionsEditorProps) {
  const { employees, organisation } = useOrganisation(undefined, { load: true });
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive),
    [employees],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listId = useId();

  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedScope, setSelectedScope] =
    useState<GoalCycleExtensionScope | null>(null);
  const [endDate, setEndDate] = useState("");

  const selectedEmployeeIds =
    selectedScope?.type === "people" ? selectedScope.employeeIds : [];

  const fallbackDepartmentIds = useMemo(() => {
    const ids = new Map<string, number>();
    let nextId = -1;
    for (const department of organisation.departments) {
      ids.set(department.id, nextId--);
    }
    return ids;
  }, [organisation.departments]);

  const fallbackTeamIds = useMemo(() => {
    const ids = new Map<string, number>();
    let nextId = -1;
    for (const team of organisation.teams) {
      ids.set(team.id, nextId--);
    }
    return ids;
  }, [organisation.teams]);

  const results = useMemo<PopulationSearchResult[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const peopleResults = activeEmployees
      .filter(
        (employee) =>
          !selectedEmployeeIds.includes(employee.employeeId) &&
          includesQuery(
            [
              employee.employeeId,
              employee.fullName,
              employee.email,
              employee.jobTitle,
              employee.department,
              employee.team,
              employee.division,
              employee.jobGrade,
            ],
            normalizedQuery,
          ),
      )
      .map((employee) => ({
        key: `person:${employee.employeeId}`,
        section: "People" as const,
        label: employee.fullName,
        description:
          [employee.jobTitle, employee.department].filter(Boolean).join(" · ") ||
          employee.email,
        icon: UserRound,
        person: employee,
        scope: {
          type: "people" as const,
          employeeIds: [toIntegerId(employee.employeeId) ?? employee.employeeId],
        },
        score: nameRelevanceScore(
          employee.fullName,
          [
            employee.employeeId,
            employee.email,
            employee.jobTitle,
            employee.department,
            employee.team,
            employee.division,
            employee.jobGrade,
          ],
          normalizedQuery,
        ),
      }))
      .sort(compareByNameRelevance)
      .slice(0, RESULT_LIMIT_PER_SECTION);

    const departmentResults = organisation.departments
      .filter((department) =>
        includesQuery(
          [
            department.name,
            department.head?.fullName ?? "",
            ...department.teams.flatMap((team) => [
              team.name,
              team.manager?.fullName ?? "",
            ]),
          ],
          normalizedQuery,
        ),
      )
      .map((department) => ({
        key: `department:${department.id}`,
        section: "Departments" as const,
        label: department.name,
        description: `${pluralize(department.headcount, "person")} · ${pluralize(
          department.teams.length,
          "team",
        )}`,
        icon: Building2,
        scope: buildDepartmentScope(
          department,
          activeEmployees,
          fallbackDepartmentIds,
        ),
        score: nameRelevanceScore(
          department.name,
          [
            department.head?.fullName ?? "",
            ...department.teams.flatMap((team) => [
              team.name,
              team.manager?.fullName ?? "",
            ]),
          ],
          normalizedQuery,
        ),
      }))
      .sort(compareByNameRelevance)
      .slice(0, RESULT_LIMIT_PER_SECTION);

    const teamResults = organisation.teams
      .filter((team) =>
        includesQuery(
          [team.name, team.departmentName, team.manager?.fullName ?? ""],
          normalizedQuery,
        ),
      )
      .map((team) => ({
        key: `team:${team.id}`,
        section: "Teams" as const,
        label: team.name,
        description: `${team.departmentName} · ${pluralize(
          team.headcount,
          "person",
        )}`,
        icon: UsersRound,
        scope: buildTeamScope(team, activeEmployees, fallbackTeamIds),
        score: nameRelevanceScore(
          team.name,
          [team.departmentName, team.manager?.fullName ?? ""],
          normalizedQuery,
        ),
      }))
      .sort(compareByNameRelevance)
      .slice(0, RESULT_LIMIT_PER_SECTION);

    const grouped = SEARCH_SECTIONS.map((section) => ({
      section,
      items:
        section === "People"
          ? peopleResults
          : section === "Departments"
            ? departmentResults
            : teamResults,
    }))
      .filter((group) => group.items.length > 0)
      .sort(compareGroupsByNameRelevance(SEARCH_SECTIONS));

    return grouped.flatMap((group) => group.items);
  }, [
    activeEmployees,
    fallbackDepartmentIds,
    fallbackTeamIds,
    organisation,
    query,
    selectedEmployeeIds,
  ]);

  const groupedResults: {
    section: SearchSection;
    results: PopulationSearchResult[];
  }[] = [];
  for (const result of results) {
    const current = groupedResults[groupedResults.length - 1];
    if (current?.section === result.section) {
      current.results.push(result);
    } else {
      groupedResults.push({ section: result.section, results: [result] });
    }
  }

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    resultRefs.current[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const resetComposer = () => {
    setIsAdding(false);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    setSelectedScope(null);
    setEndDate("");
  };

  const selectResult = (result: PopulationSearchResult) => {
    setSelectedScope((current) => mergeScopeSelection(current, result.scope));
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  const handleSearchKeyDown = (event: {
    key: string;
    preventDefault: () => void;
  }) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(
        (index) => (index - 1 + results.length) % results.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) selectResult(result);
    }
  };

  const removePerson = (employeeId: number) => {
    setSelectedScope((current) => {
      if (current?.type !== "people") return current;
      const employeeIds = current.employeeIds.filter((id) => id !== employeeId);
      return employeeIds.length > 0 ? { type: "people", employeeIds } : null;
    });
  };

  const canAdd =
    Boolean(selectedScope) &&
    compareDateTime(endDate, baseEndDate) > 0 &&
    datePart(endDate) < datePart(performanceStartDate);

  const addExtension = () => {
    if (!selectedScope || !canAdd) return;
    onChange([
      ...extensions,
      {
        id: `goal-extension-${crypto.randomUUID()}`,
        endDate,
        scope: selectedScope,
      },
    ]);
    resetComposer();
  };

  return (
    <div className="pd-cycle-extensions">
      <div className="pd-cycle-extensions__heading">
        <header className="pd-reviews-edit-card__head">
          <CalendarClock size={16} strokeWidth={1.75} aria-hidden />
          <h3 className="pd-reviews-edit-card__title">Custom Deadlines</h3>
          <HintIcon
            content="Give selected teams, departments, or people more time."
            label="About Custom Deadlines"
          />
        </header>
        {!isAdding ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            pill
            onClick={() => setIsAdding(true)}
          >
            <Plus size={15} aria-hidden />
            Add Deadline
          </Button>
        ) : null}
      </div>

      {extensions.length > 0 ? (
        <ul className="pd-cycle-extensions__list">
          {extensions.map((extension) => (
            <li key={extension.id}>
              <span className="pd-cycle-extensions__list-copy">
                {extension.scope.type === "people" ? (
                  <span className="pd-cycle-extensions__list-avatars">
                    {activeEmployees
                      .filter((employee) =>
                        extension.scope.type === "people" &&
                        extension.scope.employeeIds.includes(employee.employeeId),
                      )
                      .slice(0, 3)
                      .map((person) => (
                        <Avatar
                          key={person.employeeId}
                          name={person.fullName}
                          src={person.avatarUrl || undefined}
                          size="sm"
                          style={avatarStyle(person.fullName)}
                        />
                      ))}
                  </span>
                ) : null}
                <span>
                  <strong>{extensionLabel(extension, activeEmployees)}</strong>
                  <small>Until {formatLocalTimestamp(extension.endDate) || extension.endDate}</small>
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove deadline for ${extensionLabel(
                  extension,
                  activeEmployees,
                )}`}
                onClick={() =>
                  onChange(extensions.filter((item) => item.id !== extension.id))
                }
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : isAdding ? null : (
        <p className="pd-cycle-extensions__empty">No custom deadlines.</p>
      )}

      {isAdding ? (
        <div className="pd-cycle-extensions__composer">
          <div className="pd-cycle-extensions__population">
            <span className="pd-cycle-extensions__population-label">
              Deadline for
            </span>
            <div ref={containerRef} className="pd-cycle-extensions__search-wrap">
              <label className="pd-cycle-extensions__search">
                <Search
                  size={16}
                  strokeWidth={1.75}
                  className="pd-cycle-extensions__search-icon"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="search"
                  className="pd-cycle-extensions__search-input"
                  placeholder="Search teams, departments, or people…"
                  aria-label="Search teams, departments, or people"
                  aria-expanded={open}
                  aria-controls={listId}
                  aria-activedescendant={
                    open && results[activeIndex]
                      ? `${listId}-option-${activeIndex}`
                      : undefined
                  }
                  aria-autocomplete="list"
                  role="combobox"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                />
              </label>
              {open && query.trim() ? (
                <div
                  className="pd-cycle-extensions__search-panel"
                  role="listbox"
                  id={listId}
                  aria-label="Population search results"
                >
                  {results.length === 0 ? (
                    <div className="pd-cycle-extensions__search-empty">
                      No results found
                    </div>
                  ) : (
                    groupedResults.map((group) => (
                      <div
                        key={group.section}
                        className="pd-cycle-extensions__search-section"
                      >
                        <div className="pd-cycle-extensions__search-section-label">
                          {group.section}
                        </div>
                        <ul className="pd-cycle-extensions__search-list">
                          {group.results.map((result) => {
                            const index = results.indexOf(result);
                            const Icon = result.icon;
                            const isActive = index === activeIndex;
                            return (
                              <li
                                key={result.key}
                                id={`${listId}-option-${index}`}
                                ref={(element) => {
                                  resultRefs.current[index] = element;
                                }}
                                role="option"
                                aria-selected={isActive}
                              >
                                <button
                                  type="button"
                                  className={
                                    isActive
                                      ? "pd-cycle-extensions__search-result pd-cycle-extensions__search-result--active"
                                      : "pd-cycle-extensions__search-result"
                                  }
                                  onClick={() => selectResult(result)}
                                  onMouseEnter={() => setActiveIndex(index)}
                                >
                                  {result.person ? (
                                    <Avatar
                                      name={result.person.fullName}
                                      src={result.person.avatarUrl || undefined}
                                      size="sm"
                                      style={avatarStyle(result.person.fullName)}
                                    />
                                  ) : (
                                    <span
                                      className="pd-cycle-extensions__search-result-icon"
                                      aria-hidden
                                    >
                                      <Icon size={14} strokeWidth={2} />
                                    </span>
                                  )}
                                  <span className="pd-cycle-extensions__search-result-text">
                                    <span className="pd-cycle-extensions__search-result-label">
                                      {result.label}
                                    </span>
                                    {result.description ? (
                                      <span className="pd-cycle-extensions__search-result-description">
                                        {result.description}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {selectedScope ? (
              <div className="pd-cycle-extensions__selection">
                {selectedScope.type === "department" ? (
                  <span className="pd-cycle-extensions__chip">
                    <Building2 size={13} aria-hidden />
                    {selectedScope.departmentName}
                    <button
                      type="button"
                      aria-label={`Remove ${selectedScope.departmentName}`}
                      onClick={() => setSelectedScope(null)}
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </span>
                ) : null}
                {selectedScope.type === "team" ? (
                  <span className="pd-cycle-extensions__chip">
                    <UsersRound size={13} aria-hidden />
                    {selectedScope.teamName} · {selectedScope.departmentName}
                    <button
                      type="button"
                      aria-label={`Remove ${selectedScope.teamName}`}
                      onClick={() => setSelectedScope(null)}
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </span>
                ) : null}
                {selectedScope.type === "people"
                  ? activeEmployees
                      .filter((employee) =>
                        selectedScope.employeeIds.includes(employee.employeeId),
                      )
                      .map((person) => (
                        <span
                          key={person.employeeId}
                          className="pd-cycle-extensions__chip"
                        >
                          <Avatar
                            name={person.fullName}
                            src={person.avatarUrl || undefined}
                            size="sm"
                            style={avatarStyle(person.fullName)}
                          />
                          {person.fullName}
                          <button
                            type="button"
                            aria-label={`Remove ${person.fullName}`}
                            onClick={() => removePerson(person.employeeId)}
                          >
                            <X size={12} aria-hidden />
                          </button>
                        </span>
                      ))
                  : null}
              </div>
            ) : null}
          </div>

          <label className="pd-cycle-extensions__date">
            <span>Custom deadline</span>
            <Input
              type="datetime"
              min={baseEndDate}
              max={dayBefore(performanceStartDate)}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <div className="pd-cycle-extensions__actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              pill
              onClick={resetComposer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              pill
              disabled={!canAdd}
              onClick={addExtension}
            >
              Add Deadline
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function extensionLabel(
  extension: GoalCycleExtension,
  employees: ReturnType<typeof useOrganisation>["employees"],
): string {
  const scope = extension.scope;
  if (scope.type === "department") return scope.departmentName;
  if (scope.type === "team") {
    return `${scope.teamName} · ${scope.departmentName}`;
  }
  const names = employees
    .filter((employee) => scope.employeeIds.includes(employee.employeeId))
    .map((employee) => employee.fullName);
  if (names.length === 0) return `${scope.employeeIds.length} people`;
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
