import { fetchNotificationRules } from './rulesApi'
import type { NotificationRule } from './ruleTypes'

let cache: Map<string, NotificationRule> | null = null
let loadPromise: Promise<void> | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeNotificationRules(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCachedNotificationRule(
  eventKey: string,
): NotificationRule | null {
  return cache?.get(eventKey) ?? null
}

export function setNotificationRulesCache(rules: NotificationRule[]): void {
  cache = new Map(rules.map((rule) => [rule.eventKey, rule]))
  notify()
}

export async function ensureNotificationRulesLoaded(): Promise<void> {
  if (cache) return
  if (!loadPromise) {
    loadPromise = fetchNotificationRules()
      .then((rules) => {
        setNotificationRulesCache(rules)
      })
      .catch(() => {
        cache = new Map()
      })
      .finally(() => {
        loadPromise = null
      })
  }
  await loadPromise
}

export function resetNotificationRulesCacheForTests(): void {
  cache = null
  loadPromise = null
}
