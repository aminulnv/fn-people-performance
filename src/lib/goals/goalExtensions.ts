import type { DemoPerson, GoalsCycle } from "./types";

function matchesPerson(
  extension: NonNullable<GoalsCycle["goalExtensions"]>[number],
  person: DemoPerson,
): boolean {
  const scope = extension.scope;
  if (scope.type === "department") {
    return (
      person.departmentId === scope.departmentId ||
      person.department === scope.departmentName
    );
  }
  if (scope.type === "team") {
    return (
      person.teamId === scope.teamId ||
      (person.team === scope.teamName &&
        person.department === scope.departmentName)
    );
  }
  return scope.employeeIds.includes(Number(person.id));
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
