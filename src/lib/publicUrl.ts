/** Public asset under Vite `base` (`/` locally, `/platform/` in production builds). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.replace(/^\/+/, '')
  return `${base}${normalized}`
}
