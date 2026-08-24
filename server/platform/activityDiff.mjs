/**
 * Field-level goal diffs for the activity ledger.
 * Never persist a whole goal object — only readable { field, from, to } rows.
 */

function excerpt(value, max = 140) {
  const text = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function same(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function goalTitle(goal) {
  return String(goal?.description || '').trim() || 'Untitled goal'
}

function measureName(measure) {
  const title = String(measure?.measureTitle || measure?.title || '').trim()
  if (title) return title
  return measure?.kind === 'milestone' ? 'Milestone' : 'Metric'
}

function pushChange(changes, kinds, kind, field, from, to) {
  if (same(from, to)) return
  changes.push({ field, from: from ?? null, to: to ?? null })
  kinds.add(kind)
}

/**
 * @returns {{
 *   eventKey: string
 *   summary: string
 *   changes: Array<{ field: string, from?: unknown, to?: unknown }>
 *   metadata: Record<string, unknown>
 * } | null}
 */
export function classifyGoalUpdate(previous, next) {
  const changes = []
  const kinds = new Set()
  const title = goalTitle(next)

  pushChange(
    changes,
    kinds,
    'structure',
    'title',
    previous.description ?? '',
    next.description ?? '',
  )
  pushChange(
    changes,
    kinds,
    'structure',
    'details',
    previous.details ?? null,
    next.details ?? null,
  )
  pushChange(
    changes,
    kinds,
    'structure',
    'weight',
    Number(previous.weight ?? 0),
    Number(next.weight ?? 0),
  )
  pushChange(
    changes,
    kinds,
    'structure',
    'ownerId',
    previous.ownerId ?? null,
    next.ownerId ?? null,
  )
  pushChange(
    changes,
    kinds,
    'structure',
    'cascadedFromGoalId',
    previous.cascadedFromGoalId ?? null,
    next.cascadedFromGoalId ?? null,
  )

  const previousComments = new Map(
    (previous.comments ?? []).map((comment) => [comment.id, comment]),
  )
  for (const comment of next.comments ?? []) {
    if (previousComments.has(comment.id)) continue
    pushChange(
      changes,
      kinds,
      'comment',
      'comment',
      null,
      excerpt(comment.text),
    )
  }

  const previousById = new Map(
    (previous.measurements ?? []).map((measure) => [measure.id, measure]),
  )
  const nextById = new Map(
    (next.measurements ?? []).map((measure) => [measure.id, measure]),
  )

  for (const measure of next.measurements ?? []) {
    const before = previousById.get(measure.id)
    const name = measureName(measure)
    if (!before) {
      pushChange(changes, kinds, 'measure_added', name, null, 'Added')
      continue
    }

    pushChange(
      changes,
      kinds,
      'structure',
      `${name} · title`,
      before.title ?? '',
      measure.title ?? '',
    )
    pushChange(
      changes,
      kinds,
      'structure',
      `${name} · weight`,
      Number(before.weight ?? 0),
      Number(measure.weight ?? 0),
    )
    pushChange(
      changes,
      kinds,
      'structure',
      `${name} · target`,
      before.targetValue ?? null,
      measure.targetValue ?? null,
    )
    pushChange(
      changes,
      kinds,
      'structure',
      `${name} · start`,
      before.startValue ?? null,
      measure.startValue ?? null,
    )
    pushChange(
      changes,
      kinds,
      'structure',
      `${name} · direction`,
      before.direction ?? null,
      measure.direction ?? null,
    )

    const previousProof = before.proofUrl ?? null
    const nextProof = measure.proofUrl ?? null
    if (!same(previousProof, nextProof)) {
      pushChange(
        changes,
        kinds,
        previousProof ? 'proof_updated' : 'proof',
        `${name} · proof`,
        previousProof,
        nextProof,
      )
    }

    if (measure.kind === 'milestone' || before.kind === 'milestone') {
      const wasComplete = Boolean(before.complete)
      const isComplete = Boolean(measure.complete)
      if (wasComplete !== isComplete) {
        pushChange(
          changes,
          kinds,
          isComplete ? 'milestone_done' : 'milestone_reopen',
          `${name} · complete`,
          wasComplete,
          isComplete,
        )
      }
    }

    const previousLog = before.progressLog ?? []
    const nextLog = measure.progressLog ?? []
    if (nextLog.length > previousLog.length) {
      const added = nextLog.slice(previousLog.length)
      for (const entry of added) {
        pushChange(
          changes,
          kinds,
          'progress',
          name,
          entry.from ?? before.currentValue ?? null,
          entry.to ?? measure.currentValue ?? null,
        )
      }
    } else if (!same(before.currentValue ?? null, measure.currentValue ?? null)) {
      pushChange(
        changes,
        kinds,
        'progress',
        name,
        before.currentValue ?? null,
        measure.currentValue ?? null,
      )
    }
  }

  for (const measure of previous.measurements ?? []) {
    if (nextById.has(measure.id)) continue
    pushChange(changes, kinds, 'measure_removed', measureName(measure), 'Removed', null)
  }

  if (changes.length === 0) return null

  const eventKey = resolveEventKey(kinds)
  return {
    eventKey,
    summary: resolveSummary(eventKey, title, changes),
    changes,
    metadata: { title },
  }
}

function resolveEventKey(kinds) {
  if (kinds.size === 1) {
    if (kinds.has('comment')) return 'goal.comment_added'
    if (kinds.has('milestone_done')) return 'goal.milestone_completed'
    if (kinds.has('milestone_reopen')) return 'goal.milestone_reopened'
    if (kinds.has('progress')) return 'goal.metric_progress_updated'
    if (kinds.has('proof')) return 'goal.proof_added'
    if (kinds.has('proof_updated')) return 'goal.proof_updated'
  }
  return 'goal.updated'
}

function resolveSummary(eventKey, title, changes) {
  const quoted = `“${title}”`
  const firstField = changes[0]?.field
  switch (eventKey) {
    case 'goal.comment_added':
      return `Commented on ${quoted}`
    case 'goal.milestone_completed':
      return `Completed ${measureFromField(firstField)} on ${quoted}`
    case 'goal.milestone_reopened':
      return `Reopened ${measureFromField(firstField)} on ${quoted}`
    case 'goal.metric_progress_updated':
      return `Updated ${measureFromField(firstField)} on ${quoted}`
    case 'goal.proof_added':
      return `Added proof on ${quoted}`
    case 'goal.proof_updated':
      return `Updated proof on ${quoted}`
    default:
      return `Updated goal ${quoted}`
  }
}

function measureFromField(field) {
  if (!field) return 'a metric'
  const name = String(field).split(' · ')[0]
  return name ? `“${name}”` : 'a metric'
}
