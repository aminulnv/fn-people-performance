function extensionMatchesSubject(extension, subject) {
  const scope = extension?.scope
  if (scope?.type === 'department') {
    return Number(scope.departmentId) === Number(subject.departmentId)
  }
  if (scope?.type === 'team') {
    return Number(scope.teamId) === Number(subject.teamId)
  }
  if (scope?.type === 'people') {
    return (scope.employeeIds ?? []).some(
      (employeeId) => Number(employeeId) === Number(subject.employeeId),
    )
  }
  return false
}

/** Use the resolved stages config as-is. Group rows already carry group settings. */
export function stagesConfigForGoalPolicy(row) {
  return row?.stages_config
}

/** Latest matching deadline wins when population-specific extensions overlap. */
export function resolveEffectiveGoalDeadline(stagesConfig, subject) {
  const baseDeadline = stagesConfig?.goals?.employee?.endDate
  return (stagesConfig?.goals?.extensions ?? [])
    .filter((extension) => extensionMatchesSubject(extension, subject))
    .reduce(
      (latest, extension) =>
        !latest || extension.endDate > latest ? extension.endDate : latest,
      baseDeadline,
    )
}
