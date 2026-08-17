import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  Input,
  ListboxSelect,
  SegmentedControl,
} from "@/components/ui";
import { useEmployees } from "@/lib/employees/useEmployees";
import type {
  GoalCycleExtension,
  GoalCycleExtensionScope,
} from "@/lib/reviews/types";

type ScopeType = GoalCycleExtensionScope["type"];

type GoalCycleExtensionsEditorProps = {
  extensions: GoalCycleExtension[];
  baseEndDate: string;
  performanceStartDate: string;
  onChange: (extensions: GoalCycleExtension[]) => void;
};

const SCOPE_OPTIONS: { id: ScopeType; label: string }[] = [
  { id: "team", label: "Team" },
  { id: "department", label: "Department" },
  { id: "people", label: "Specific people" },
];

function dayBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function GoalCycleExtensionsEditor({
  extensions,
  baseEndDate,
  performanceStartDate,
  onChange,
}: GoalCycleExtensionsEditorProps) {
  const { employees } = useEmployees({ load: true });
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive),
    [employees],
  );
  const [isAdding, setIsAdding] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType>("team");
  const [selectedScopeId, setSelectedScopeId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [endDate, setEndDate] = useState("");

  const departments = useMemo(() => {
    const unique = new Map<string, { id: number; name: string; count: number }>();
    for (const employee of activeEmployees) {
      if (!employee.department.trim()) continue;
      const key = employee.departmentId != null
        ? String(employee.departmentId)
        : employee.department.trim().toLocaleLowerCase();
      const current = unique.get(key);
      unique.set(key, {
        id: employee.departmentId ?? -(unique.size + 1),
        name: employee.department,
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEmployees]);

  const teams = useMemo(() => {
    const unique = new Map<
      string,
      { id: number; name: string; departmentName: string; count: number }
    >();
    for (const employee of activeEmployees) {
      if (!employee.team.trim()) continue;
      const key = employee.teamId != null
        ? String(employee.teamId)
        : `${employee.department}:${employee.team}`.toLocaleLowerCase();
      const current = unique.get(key);
      unique.set(key, {
        id: employee.teamId ?? -(unique.size + 1),
        name: employee.team,
        departmentName: employee.department,
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...unique.values()].sort((a, b) =>
      `${a.departmentName} ${a.name}`.localeCompare(
        `${b.departmentName} ${b.name}`,
      ),
    );
  }, [activeEmployees]);

  const selectedPeople = activeEmployees.filter((employee) =>
    selectedEmployeeIds.includes(employee.employeeId),
  );

  const resetComposer = () => {
    setIsAdding(false);
    setScopeType("team");
    setSelectedScopeId("");
    setSelectedEmployeeIds([]);
    setEndDate("");
  };

  const changeScopeType = (nextType: ScopeType) => {
    setScopeType(nextType);
    setSelectedScopeId("");
    setSelectedEmployeeIds([]);
  };

  const addPerson = (value: string) => {
    const employeeId = Number(value);
    if (
      Number.isInteger(employeeId) &&
      !selectedEmployeeIds.includes(employeeId)
    ) {
      setSelectedEmployeeIds((current) => [...current, employeeId]);
    }
  };

  const buildScope = (): GoalCycleExtensionScope | null => {
    if (scopeType === "department") {
      const department = departments.find(
        (option) => String(option.id) === selectedScopeId,
      );
      return department
        ? {
            type: "department",
            departmentId: department.id,
            departmentName: department.name,
          }
        : null;
    }
    if (scopeType === "team") {
      const team = teams.find((option) => String(option.id) === selectedScopeId);
      return team
        ? {
            type: "team",
            teamId: team.id,
            teamName: team.name,
            departmentName: team.departmentName,
          }
        : null;
    }
    return selectedEmployeeIds.length > 0
      ? { type: "people", employeeIds: selectedEmployeeIds }
      : null;
  };

  const scope = buildScope();
  const canAdd =
    Boolean(scope) &&
    endDate > baseEndDate &&
    endDate < performanceStartDate;

  const addExtension = () => {
    if (!scope || !canAdd) return;
    onChange([
      ...extensions,
      {
        id: `goal-extension-${crypto.randomUUID()}`,
        endDate,
        scope,
      },
    ]);
    resetComposer();
  };

  return (
    <div className="pd-cycle-extensions">
      <div className="pd-cycle-extensions__heading">
        <div>
          <h4>Deadline extensions</h4>
          <p>Give selected teams, departments, or people more time.</p>
        </div>
        {!isAdding ? (
          <button
            type="button"
            className="pd-cycle-extensions__add"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={15} aria-hidden />
            Add extension
          </button>
        ) : null}
      </div>

      {extensions.length > 0 ? (
        <ul className="pd-cycle-extensions__list">
          {extensions.map((extension) => (
            <li key={extension.id}>
              <span>
                <strong>{extensionLabel(extension, activeEmployees)}</strong>
                <small>Until {extension.endDate}</small>
              </span>
              <button
                type="button"
                aria-label={`Remove extension for ${extensionLabel(
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
      ) : (
        <p className="pd-cycle-extensions__empty">No deadline extensions.</p>
      )}

      {isAdding ? (
        <div className="pd-cycle-extensions__composer">
          <SegmentedControl
            aria-label="Extension population"
            options={SCOPE_OPTIONS}
            value={scopeType}
            onChange={changeScopeType}
          />

          {scopeType === "department" ? (
            <ListboxSelect
              value={selectedScopeId}
              onValueChange={setSelectedScopeId}
              options={departments.map((department) => ({
                value: String(department.id),
                label: department.name,
                description: `${department.count} people`,
              }))}
              placeholder="Select a department"
              searchable
              searchPlaceholder="Search departments"
              aria-label="Department to extend"
            />
          ) : scopeType === "team" ? (
            <ListboxSelect
              value={selectedScopeId}
              onValueChange={setSelectedScopeId}
              options={teams.map((team) => ({
                value: String(team.id),
                label: team.name,
                description: `${team.departmentName} · ${team.count} people`,
              }))}
              placeholder="Select a team"
              searchable
              searchPlaceholder="Search teams"
              aria-label="Team to extend"
            />
          ) : (
            <div className="pd-cycle-extensions__people">
              <ListboxSelect
                value=""
                onValueChange={addPerson}
                options={activeEmployees
                  .filter(
                    (employee) =>
                      !selectedEmployeeIds.includes(employee.employeeId),
                  )
                  .map((employee) => ({
                    value: String(employee.employeeId),
                    label: employee.fullName,
                    description: [employee.jobTitle, employee.department]
                      .filter(Boolean)
                      .join(" · "),
                  }))}
                placeholder="Add people"
                searchable
                searchPlaceholder="Search people"
                aria-label="People to extend"
              />
              {selectedPeople.length > 0 ? (
                <div className="pd-cycle-extensions__chips">
                  {selectedPeople.map((person) => (
                    <span key={person.employeeId}>
                      {person.fullName}
                      <button
                        type="button"
                        aria-label={`Remove ${person.fullName}`}
                        onClick={() =>
                          setSelectedEmployeeIds((current) =>
                            current.filter((id) => id !== person.employeeId),
                          )
                        }
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <label className="pd-cycle-extensions__date">
            <span>Extended deadline</span>
            <Input
              type="date"
              min={baseEndDate}
              max={dayBefore(performanceStartDate)}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <div className="pd-cycle-extensions__actions">
            <button type="button" onClick={resetComposer}>
              Cancel
            </button>
            <button type="button" disabled={!canAdd} onClick={addExtension}>
              Add extension
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function extensionLabel(
  extension: GoalCycleExtension,
  employees: ReturnType<typeof useEmployees>["employees"],
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
