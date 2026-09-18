/** Cookie signing secret. There is no built-in fallback. */
export function sessionSecret() {
  const secret =
    process.env.PLATFORM_SESSION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error(
      'Set PLATFORM_SESSION_SECRET or SESSION_SECRET. The server will not start without one.',
    )
  }
  return secret
}
