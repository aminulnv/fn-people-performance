/**
 * Returns the database predicate used when ratings are published.
 *
 * Exclusions only block employee publication. Managers may still receive the
 * rating so they can handle the result outside the automatic employee flow.
 */
export function publicationExclusionClause(target) {
  if (target !== 'employees') return ''
  return `
         AND NOT EXISTS (
           SELECT 1
           FROM platform.review_cycle_grade_exclusions exclusion
           WHERE exclusion.cycle_id = platform.review_packets.cycle_id
             AND exclusion.employee_id = platform.review_packets.employee_id
         )`
}
