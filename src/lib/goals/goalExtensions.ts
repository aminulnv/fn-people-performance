import { toIntegerId } from "@/lib/integerId";
import type { DemoPerson, GoalsCycle } from "./types";

function matchesPerson(
  extension: NonNullable<GoalsCycle["goalExtensions"]>[number],
  person: DemoPerson,
): boolean {
  const scope = extension.scope;
  if (scope.type === "department") {
    const departmentId = toIntegerId(person.departmentId);
    return (
      (departmentId != null && departmentId === toIntegerId(scope.departmentId)) ||
      person.department === scope.departmentName
    );
  }
  if (scope.type === "team") {
    const teamId = toIntegerId(person.teamId);
    return (
      (teamId != null && teamId === toIntegerId(scope.teamId)) ||
      (person.team === scope.teamName &&
        person.department === scope.departmentName)
    );
  }
  return scope.employeeIds.some(
    (employeeId) => toIntegerId(employeeId) === toIntegerId(person.id),
  );
}

/** Latest matching deadline wins when a person is covered by multiple extensions. */
export function resolveGoalDeadline(
  cycle: GoalsCycle,
  person: DemoPerson,
): string | undefined {
  const baseDeadline = cycle.goalWindow?.endDate;
  return (cycle.goalExtensions ?? [])
    .filter((extension) => matchesPerson(extension, person))
    .reduce(
      (latest, extension) =>
        !latest || extension.endDate > latest ? extension.endDate : latest,
      baseDeadline,
    );
}

export function isGoalWindowOpenForPerson(
  cycle: GoalsCycle,
  person: DemoPerson,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  const deadline = resolveGoalDeadline(cycle, person);
  return Boolean(
    deadline &&
      cycle.goalWindow?.startDate &&
      today >= cycle.goalWindow.startDate &&
      today <= deadline,
  );
}
