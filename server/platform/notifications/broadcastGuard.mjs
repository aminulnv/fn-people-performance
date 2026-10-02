/**
 * Keeps company-wide / cycle-wide notification blasts from leaving a
 * non-production process. Mirrors the OKR broadcast isolation rule.
 *
 * Full audience only when NODE_ENV=production and BROADCAST_NOTIFY_ALL_USERS
 * is not explicitly off. Everywhere else the audience collapses to
 * PLATFORM_DEVELOPER_EMAILS (fail closed if empty).
 */

function envFlagOff(env, name) {
  const raw = env[name]?.trim?.() ?? String(env[name] ?? '').trim()
  const normalized = raw.toLowerCase()
  return (
    normalized === '0' ||
    normalized === 'false' ||
    normalized === 'no' ||
    normalized === 'off'
  )
}

export function isFullBroadcastAllowed(env = process.env) {
  if (env.NODE_ENV !== 'production') return false
  if (envFlagOff(env, 'BROADCAST_NOTIFY_ALL_USERS')) return false
  if (envFlagOff(env, 'PLATFORM_BROADCAST_NOTIFY_ALL')) return false
  return true
}

export function developerEmailAllowlist(env = process.env) {
  return String(env.PLATFORM_DEVELOPER_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Restrict a bulk recipient list for broadcast-class sends.
 * Returns employee ids that may receive the notice in this environment.
 */
export async function restrictBroadcastRecipients(client, employeeIds) {
  const ids = [
    ...new Set(
      (employeeIds ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ]
  if (ids.length === 0) return []
  if (isFullBroadcastAllowed()) return ids

  const allow = developerEmailAllowlist()
  if (allow.length === 0) {
    console.warn(
      '[notifications] broadcast blocked: set PLATFORM_DEVELOPER_EMAILS or run in production',
    )
    return []
  }

  const { rows } = await client.query(
    `SELECT employee_id
     FROM platform.employees
     WHERE employee_id = ANY($1::int[])
       AND status = 'active'
       AND lower(email) = ANY($2::text[])`,
    [ids, allow],
  )
  return rows
    .map((row) => Number(row.employee_id))
    .filter((id) => Number.isInteger(id) && id > 0)
}
