import rateLimit from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000

function isRateLimitEnabled(env = process.env) {
  if (env.RATE_LIMIT_DISABLED === 'true') return false
  return env.NODE_ENV === 'production' || env.RATE_LIMIT_ENABLED === 'true'
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

export const authRateLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isRateLimitEnabled(),
  keyGenerator: clientIp,
  handler: (_req, res, _next, options) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfterSeconds: Math.ceil((options.windowMs ?? FIFTEEN_MINUTES) / 1000),
    })
  },
})
