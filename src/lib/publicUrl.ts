/**
 * Public asset under Vite `base` (`/` locally, `/platform/` in production builds).
 * Always use this for files in `public/` — never hardcode root-absolute paths
 * such as slash-images-… (those break under `/platform/` in production).
 */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.replace(/^\/+/, '')
  const encoded = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${base}${encoded}`
}
