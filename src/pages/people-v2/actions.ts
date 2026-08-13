/** Clipboard and download helpers for directory bulk actions. */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadTextFile(
  filename: string,
  content: string,
  type = 'text/csv;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** `people-2026-08-12.csv` */
export function timestampedFilename(prefix: string, extension = 'csv'): string {
  const today = new Date().toISOString().slice(0, 10)
  return `${prefix}-${today}.${extension}`
}
