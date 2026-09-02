/**
 * Platform-only auth - separate from dashboard Google / pd.sid.
 * Cookie: pd_platform_sid
 *
 * Google OAuth:
 *   GET  /api/platform/auth/google
 *   GET  /api/platform/auth/google/callback
 *
 * Requires PLATFORM_GOOGLE_CLIENT_ID + PLATFORM_GOOGLE_CLIENT_SECRET
 * (separate Google Cloud project / OAuth client - never the dashboard's).
 *
 * Authorized redirect URIs (Google Cloud Console):
 *   https://performance.nextventures.io/api/platform/auth/google/callback
 *   http://localhost:8001/api/platform/auth/google/callback
 */
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { getAppUrl } from '../auth.mjs'
import { getPool } from '../db.mjs'
import { asyncHandler, HttpError } from '../errors.mjs'
import { authRateLimit } from '../rateLimit.mjs'
import { getEmployeeAccess } from './store.mjs'

const COOKIE_NAME = 'pd_platform_sid'
const OAUTH_STATE_COOKIE = 'pd_platform_oauth'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14 // 14 days
const OAUTH_STATE_MAX_AGE_MS = 1000 * 60 * 10 // 10 minutes

/** Vite DEV origin - only these may override production getAppUrl via X-Forwarded-*. */
const LOCAL_DEV_HOSTS = new Set(['localhost:8001', '127.0.0.1:8001'])

function forwardedHeader(req, name) {
  const raw = req?.get?.(name) || req?.headers?.[name]
  if (typeof raw !== 'string' || !raw.trim()) return ''
  return raw.split(',')[0].trim()
}

/**
 * Public origin for OAuth redirect_uri and post-login redirects.
 * When Vite proxies /api with X-Forwarded-Host=localhost:8001, Google returns
 * to localhost (Console URI) and the proxy forwards the callback to EC2.
 */
function platformPublicOrigin(req) {
  const host = forwardedHeader(req, 'x-forwarded-host')
  if (LOCAL_DEV_HOSTS.has(host)) {
    // Vite DEV is always HTTP; nginx may overwrite X-Forwarded-Proto to https.
    return `http://${host}`
  }
  return getAppUrl(req)
}

function isLocalDevProxy(req) {
  return LOCAL_DEV_HOSTS.has(forwardedHeader(req, 'x-forwarded-host'))
}
function sessionSecret() {
  return (
    process.env.PLATFORM_SESSION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    'platform-dev-session-secret'
  )
}

function allowedDomain() {
  return (
    process.env.PLATFORM_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() ||
    'nextventures.io'
  )
}

/** Shared temporary password for email login - set PLATFORM_DEFAULT_PASSWORD on the server only. */
function defaultPassword() {
  const password = process.env.PLATFORM_DEFAULT_PASSWORD?.trim()
  if (!password) {
    throw new HttpError(
      503,
      'PLATFORM_DEFAULT_PASSWORD is not configured on the server.',
    )
  }
  return password
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromB64url(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64').toString('utf8')
}

function signPayload(payload) {
  const body = b64url(JSON.stringify(payload))
  const sig = crypto
    .createHmac('sha256', sessionSecret())
    .update(body)
    .digest('base64url')
  return `${body}.${sig}`
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto
    .createHmac('sha256', sessionSecret())
    .update(body)
    .digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(fromB64url(body))
    if (!payload?.email || !payload?.exp) return null
    if (Date.now() > Number(payload.exp)) return null
    return payload
  } catch {
    return null
  }
}

function cookieOptions(req, maxAge = MAX_AGE_MS) {
  // Proxied localhost must not get Secure cookies (HTTP Vite).
  const secure = isLocalDevProxy(req)
    ? false
    : process.env.NODE_ENV === 'production' ||
    req?.secure === true ||
    req?.get?.('x-forwarded-proto') === 'https'
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  }
}

function readCookie(req, name) {
  const header = req.headers?.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (rawKey === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function serializeCookie(name, value, opts) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (opts.maxAge != null) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(Number(opts.maxAge) / 1000))}`)
  }
  if (opts.path) parts.push(`Path=${opts.path}`)
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
  return parts.join('; ')
}

function setCookie(req, res, name, value, maxAge) {
  res.append(
    'Set-Cookie',
    serializeCookie(name, value, cookieOptions(req, maxAge)),
  )
}

function clearCookie(req, res, name) {
  res.append(
    'Set-Cookie',
    serializeCookie(name, '', { ...cookieOptions(req, 0), maxAge: 0 }),
  )
}

function setPlatformCookie(req, res, token) {
  setCookie(req, res, COOKIE_NAME, token, MAX_AGE_MS)
}

function clearPlatformCookie(req, res) {
  clearCookie(req, res, COOKIE_NAME)
}

function platformCallbackUrl(req) {
  return `${platformPublicOrigin(req)}/api/platform/auth/google/callback`
}

function getPlatformOAuthClient(req) {
  const clientId = process.env.PLATFORM_GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.PLATFORM_GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error(
      'Set PLATFORM_GOOGLE_CLIENT_ID and PLATFORM_GOOGLE_CLIENT_SECRET in the server .env (platform OAuth only - do not reuse dashboard Google credentials).',
    )
  }
  return new OAuth2Client(clientId, clientSecret, platformCallbackUrl(req))
}

function safeReturnTo(value) {
  if (typeof value !== 'string') return '/platform/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/platform/'
  // Production SPA is under /platform; local Vite serves at /.
  if (value === '/' || value === '/login' || value.startsWith('/login?')) return value
  if (value === '/platform' || value.startsWith('/platform/')) return value
  return '/platform/'
}

function redirectPlatform(res, path, req) {
  const base = platformPublicOrigin(req)
  const normalized = path.startsWith('/') ? path : `/${path}`
  return res.redirect(`${base}${normalized}`)
}

async function findEmployeeByEmail(email) {
  try {
    const { rows } = await getPool().query(
      `SELECT employee_id, email, name, job_title, status
       FROM platform.employees
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email],
    )
    return rows[0] ?? null
  } catch {
    return null
  }
}

/** Only active People directory rows may sign in. */
async function requireActiveEmployee(email) {
  const employee = await findEmployeeByEmail(email)
  if (!employee) {
    const err = new HttpError(
      403,
      'No People Performance account found for this email. Ask an admin to add you.',
    )
    err.code = 'not_an_employee'
    throw err
  }
  if (employee.status !== 'active') {
    const err = new HttpError(403, 'This account is inactive.')
    err.code = 'inactive'
    throw err
  }
  return employee
}

function bootstrapAdminEmails() {
  const configured = String(process.env.PLATFORM_BOOTSTRAP_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  // First read+write admin until a persistent assignment exists.
  if (configured.length === 0) {
    configured.push('aminul.islam@nextventures.io')
  }
  return new Set(configured)
}

export async function permissionsForPlatformUser(user) {
  const email = String(user?.email ?? '').trim().toLowerCase()
  if (email && bootstrapAdminEmails().has(email)) {
    return [
      'platform.read_all',
      'platform.write_all',
      'access.manage',
      'activity.read_all',
      'activity.export',
    ]
  }
  const access = await getEmployeeAccess(user?.employeeId ?? null)
  return access.permissions
}

async function toPublicUser(payload, employee) {
  const employeeId = employee?.employee_id ?? payload.employeeId ?? null
  const permissions = await permissionsForPlatformUser({
    email: payload.email,
    employeeId,
  })
  return {
    id: payload.sub || payload.email,
    email: payload.email,
    name: employee?.name || payload.name || payload.email,
    employeeId,
    title: employee?.job_title || '',
    permissions,
  }
}

async function issuePlatformSession(req, res, { email, name, picture, sub }) {
  const employee = await findEmployeeByEmail(email)
  const payload = {
    sub: sub || (employee ? `emp:${employee.employee_id}` : `email:${email}`),
    email,
    name: employee?.name || name || email.split('@')[0],
    picture: picture ?? null,
    employeeId: employee?.employee_id ?? null,
    exp: Date.now() + MAX_AGE_MS,
  }
  setPlatformCookie(req, res, signPayload(payload))
  return toPublicUser(payload, employee)
}

export function requirePlatformAuth(req, res, next) {
  const token = readCookie(req, COOKIE_NAME)
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  req.platformUser = {
    email: payload.email,
    name: payload.name,
    sub: payload.sub,
    employeeId: payload.employeeId ?? null,
  }
  next()
}

export function requirePlatformPermission(permission) {
  return async function platformPermissionMiddleware(req, res, next) {
    try {
      const permissions = await permissionsForPlatformUser(req.platformUser)
      if (!permissions.includes(permission)) {
        return res.status(403).json({ error: 'Insufficient access' })
      }
      req.platformUser.permissions = permissions
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function registerPlatformAuthRoutes(app) {
  app.get(
    '/api/platform/auth/google',
    authRateLimit,
    (req, res, next) => {
      try {
        const client = getPlatformOAuthClient(req)
        const state = crypto.randomBytes(24).toString('hex')
        const returnTo = safeReturnTo(
          typeof req.query.returnTo === 'string' ? req.query.returnTo : '/platform/',
        )
        setCookie(
          req,
          res,
          OAUTH_STATE_COOKIE,
          signPayload({
            email: 'oauth-state',
            state,
            returnTo,
            exp: Date.now() + OAUTH_STATE_MAX_AGE_MS,
          }),
          OAUTH_STATE_MAX_AGE_MS,
        )
        const url = client.generateAuthUrl({
          access_type: 'online',
          scope: ['openid', 'email', 'profile'],
          prompt: 'select_account',
          state,
        })
        res.redirect(url)
      } catch (err) {
        next(err)
      }
    },
  )

  app.get(
    '/api/platform/auth/google/callback',
    authRateLimit,
    asyncHandler(async (req, res) => {
      const fail = (code) =>
        redirectPlatform(res, `/platform/login?error=${encodeURIComponent(code)}`, req)

      const code = req.query.code
      if (!code || typeof code !== 'string') return fail('missing_code')

      const stateCookie = readCookie(req, OAUTH_STATE_COOKIE)
      const statePayload = verifyToken(stateCookie)
      clearCookie(req, res, OAUTH_STATE_COOKIE)

      const state = typeof req.query.state === 'string' ? req.query.state : null
      if (
        !statePayload ||
        statePayload.email !== 'oauth-state' ||
        !state ||
        statePayload.state !== state
      ) {
        return fail('invalid_state')
      }

      try {
        const client = getPlatformOAuthClient(req)
        const { tokens } = await client.getToken(code)
        if (!tokens.id_token) return fail('no_id_token')

        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.PLATFORM_GOOGLE_CLIENT_ID,
        })
        const profile = ticket.getPayload()
        if (!profile?.email) return fail('no_email')

        const email = profile.email.toLowerCase()
        const domain = allowedDomain()
        if (domain && !email.endsWith(`@${domain}`)) {
          return fail('domain_not_allowed')
        }

        try {
          await requireActiveEmployee(email)
        } catch (gateErr) {
          if (gateErr instanceof HttpError && gateErr.code === 'not_an_employee') {
            return fail('not_an_employee')
          }
          if (gateErr instanceof HttpError && gateErr.code === 'inactive') {
            return fail('inactive')
          }
          throw gateErr
        }

        await issuePlatformSession(req, res, {
          email,
          name: profile.name,
          picture: profile.picture,
          sub: profile.sub,
        })

        const returnTo = safeReturnTo(statePayload.returnTo)
        return redirectPlatform(res, returnTo, req)
      } catch (err) {
        console.error('[platform-auth] Google callback failed:', err)
        return fail('auth_failed')
      }
    }),
  )

  app.get(
    '/api/platform/auth/me',
    asyncHandler(async (req, res) => {
      const token = readCookie(req, COOKIE_NAME)
      const payload = verifyToken(token)
      if (!payload) {
        return res.status(401).json({ authenticated: false })
      }
      const employee = await findEmployeeByEmail(payload.email)
      res.json({
        authenticated: true,
        user: await toPublicUser(payload, employee),
      })
    }),
  )

  app.post(
    '/api/platform/auth/logout',
    asyncHandler(async (req, res) => {
      clearPlatformCookie(req, res)
      clearCookie(req, res, OAUTH_STATE_COOKIE)
      res.json({ ok: true })
    }),
  )

  /**
   * Email + password login (temporary shared default password).
   * Body: { email | username, password }
   * Username-only values are completed as user@PLATFORM_ALLOWED_EMAIL_DOMAIN.
   */
  app.post(
    '/api/platform/auth/login',
    authRateLimit,
    asyncHandler(async (req, res) => {
      const domain = allowedDomain()
      const rawIdentity = String(req.body?.email ?? req.body?.username ?? '')
        .trim()
        .toLowerCase()
      const password = String(req.body?.password ?? '')
      const name = String(req.body?.name ?? '').trim()

      let email = rawIdentity
      if (email && !email.includes('@')) {
        email = `${email}@${domain}`
      }

      if (!email || !email.includes('@')) {
        throw new HttpError(400, 'Username is required.')
      }
      if (!password) {
        throw new HttpError(400, 'Password is required.')
      }

      if (domain && !email.endsWith(`@${domain}`)) {
        throw new HttpError(403, `Only @${domain} accounts can sign in.`)
      }

      const expected = defaultPassword()
      const a = Buffer.from(password)
      const b = Buffer.from(expected)
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new HttpError(401, 'Invalid email or password.')
      }

      const employee = await requireActiveEmployee(email)
      const user = await issuePlatformSession(req, res, {
        email,
        name: employee.name || name || email.split('@')[0],
      })
      res.json({ authenticated: true, user })
    }),
  )
}
