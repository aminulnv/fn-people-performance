import { normalizeUrlHash } from '@/lib/routing/urlHash'

export type SettingsSectionId =
  | 'appearance'
  | 'assistant'
  | 'access'
  | 'activity'
  | 'about'

const SETTINGS_SECTION_HASHES: Record<SettingsSectionId, string> = {
  appearance: 'appearance',
  assistant: 'assistant',
  access: 'access',
  activity: 'activity',
  about: 'about',
}

export function settingsSectionFromHash(hash: string): SettingsSectionId | null {
  const normalized = normalizeUrlHash(hash)
  if (
    normalized === 'appearance' ||
    normalized === 'assistant' ||
    normalized === 'access' ||
    normalized === 'activity' ||
    normalized === 'about'
  ) {
    return normalized
  }
  return null
}

export function hashForSettingsSection(section: SettingsSectionId): string {
  return SETTINGS_SECTION_HASHES[section]
}

/** Legacy `?section=` values that should become hashes. */
export function settingsSectionFromQuery(
  value: string | null,
): SettingsSectionId | null {
  if (value === 'sidebar') return 'appearance'
  return settingsSectionFromHash(value ?? '')
}
