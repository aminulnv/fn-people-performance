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

/** Grouped people use the group window only — cycle extensions do not apply. */
export function stagesConfigForGoalPolicy(row) {
  const stagesConfig = row?.stages_config
  if (!row?.group_id) return stagesConfig
  return {
    ...stagesConfig,
    goals: {
      ...(stagesConfig?.goals ?? {}),
      extensions: [],
    },
  }
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
