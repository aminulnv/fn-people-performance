import { HttpError } from '../../errors.mjs'

const DEFAULT_OKR_API_URL = 'https://okr.nextventures.io'

/** Strip an optional NXT prefix and keep a positive HR employee id. */
export function normalizeHrEmployeeId(value) {
  if (value == null || value === '') return null
  const raw = String(value).trim().replace(/^NXT/i, '')
  const employeeId = Number(raw)
  if (!Number.isInteger(employeeId) || employeeId <= 0) return null
  return employeeId
}

export function okrApiConfigured(env = process.env) {
  return Boolean(env.PERFORMANCE_OKR_API_KEY?.trim())
}

function okrApiBaseUrl(env = process.env) {
  return (
    env.PERFORMANCE_OKR_API_URL?.trim().replace(/\/$/, '') || DEFAULT_OKR_API_URL
  )
}

function readOkrErrorMessage(body, fallback) {
  if (!body || typeof body !== 'object') return fallback
  const error = body.error
  if (typeof error === 'string' && error.trim()) return error
  if (
    error &&
    typeof error === 'object' &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message
  }
  return fallback
}

/**
 * Machine-to-machine lookup of one employee's key results and special projects.
 * The API key stays on this server — never forwarded to the browser.
 */
export async function fetchPerformanceEmployeeKrs(
  { employeeId, email, quarter } = {},
  env = process.env,
  fetchImpl = fetch,
) {
  const apiKey = env.PERFORMANCE_OKR_API_KEY?.trim()
  if (!apiKey) {
    throw new HttpError(503, 'OKR integration is not configured')
  }

  const hrId = normalizeHrEmployeeId(employeeId)
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  if (!hrId && !trimmedEmail) {
    throw new HttpError(400, 'email or employeeId is required')
  }

  const params = new URLSearchParams()
  if (hrId && trimmedEmail) {
    // The upstream API 400s when both identify different people. Prefer HR id.
    params.set('employeeId', String(hrId))
  } else if (hrId) {
    params.set('employeeId', String(hrId))
  } else {
    params.set('email', trimmedEmail)
  }
  if (typeof quarter === 'string' && quarter.trim()) {
    params.set('quarter', quarter.trim())
  }

  const url = `${okrApiBaseUrl(env)}/api/integrations/performance/employee-krs?${params}`
  let response
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })
  } catch {
    throw new HttpError(502, 'Could not reach the OKR platform')
  }

  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    throw new HttpError(
      response.status >= 400 && response.status < 600 ? response.status : 502,
      readOkrErrorMessage(body, 'Could not load OKRs'),
    )
  }

  return body
}
