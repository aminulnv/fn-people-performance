/**
 * Minimal HTTP error helpers for the standalone platform API.
 * Intentionally small — do not pull dashboard monitoring/audit deps.
 */

export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} publicMessage
   * @param {{ expose?: boolean, details?: unknown, code?: string }} [options]
   */
  constructor(statusCode, publicMessage, options = {}) {
    super(publicMessage)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.publicMessage = publicMessage
    this.expose = options.expose ?? statusCode < 500
    this.details = options.details
    if (options.code) this.code = options.code
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err)
    return
  }
  const status =
    err instanceof HttpError
      ? err.statusCode
      : typeof err?.statusCode === 'number'
        ? err.statusCode
        : 500
  const message =
    err instanceof HttpError
      ? err.publicMessage
      : status < 500 && err instanceof Error
        ? err.message
        : 'An unexpected error occurred'

  if (status >= 500) {
    console.error(
      '[platform-api]',
      JSON.stringify({
        path: req.originalUrl ?? req.url,
        method: req.method,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
  }

  const body = { error: message }
  if (err instanceof HttpError && err.expose && err.details !== undefined) {
    body.details = err.details
  }
  res.status(status).json(body)
}
