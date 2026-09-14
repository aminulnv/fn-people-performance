import type { ReviewQuestionKind } from './types'

export type DualTextAnswer = { a: string; b: string }

export type ParsedQuestionAnswer =
  | { kind: 'open_ended'; value: string }
  | { kind: 'yes_no'; value: '' | 'yes' | 'no' }
  | { kind: 'multiple_choice'; value: string }
  | { kind: 'dual_text'; value: DualTextAnswer }

function resolveKind(kind?: ReviewQuestionKind | null): ReviewQuestionKind {
  return kind ?? 'open_ended'
}

export function emptyAnswer(kind?: ReviewQuestionKind | null): ParsedQuestionAnswer {
  const resolved = resolveKind(kind)
  if (resolved === 'yes_no') return { kind: 'yes_no', value: '' }
  if (resolved === 'multiple_choice') return { kind: 'multiple_choice', value: '' }
  if (resolved === 'dual_text') return { kind: 'dual_text', value: { a: '', b: '' } }
  return { kind: 'open_ended', value: '' }
}

export function parseAnswer(
  kind: ReviewQuestionKind | null | undefined,
  body: string | null | undefined,
): ParsedQuestionAnswer {
  const resolved = resolveKind(kind)
  const raw = body ?? ''

  if (resolved === 'yes_no') {
    if (raw === 'yes' || raw === 'no') return { kind: 'yes_no', value: raw }
    return { kind: 'yes_no', value: '' }
  }

  if (resolved === 'multiple_choice') {
    return { kind: 'multiple_choice', value: raw }
  }

  if (resolved === 'dual_text') {
    if (!raw.trim()) return { kind: 'dual_text', value: { a: '', b: '' } }
    try {
      const parsed = JSON.parse(raw) as { a?: unknown; b?: unknown }
      if (parsed && typeof parsed === 'object') {
        return {
          kind: 'dual_text',
          value: {
            a: typeof parsed.a === 'string' ? parsed.a : '',
            b: typeof parsed.b === 'string' ? parsed.b : '',
          },
        }
      }
    } catch {
      /* Legacy plain text → first field */
    }
    return { kind: 'dual_text', value: { a: raw, b: '' } }
  }

  return { kind: 'open_ended', value: raw }
}

export function serializeAnswer(
  kind: ReviewQuestionKind | null | undefined,
  value: ParsedQuestionAnswer['value'] | string | DualTextAnswer,
): string {
  const resolved = resolveKind(kind)

  if (resolved === 'yes_no') {
    return value === 'yes' || value === 'no' ? value : ''
  }

  if (resolved === 'multiple_choice') {
    return typeof value === 'string' ? value : ''
  }

  if (resolved === 'dual_text') {
    const dual =
      value && typeof value === 'object' && 'a' in value && 'b' in value
        ? { a: String(value.a ?? ''), b: String(value.b ?? '') }
        : { a: typeof value === 'string' ? value : '', b: '' }
    if (!dual.a && !dual.b) return ''
    return JSON.stringify(dual)
  }

  return typeof value === 'string' ? value : ''
}

/** Human-readable text for scorecard view mode. */
export function formatAnswerForDisplay(
  kind: ReviewQuestionKind | null | undefined,
  body: string | null | undefined,
  dualLabels?: [string, string],
): string {
  const parsed = parseAnswer(kind, body)
  if (parsed.kind === 'yes_no') {
    if (parsed.value === 'yes') return 'Yes'
    if (parsed.value === 'no') return 'No'
    return ''
  }
  if (parsed.kind === 'dual_text') {
    const [labelA, labelB] = dualLabels ?? ['Field 1', 'Field 2']
    const lines: string[] = []
    if (parsed.value.a.trim()) lines.push(`${labelA}: ${parsed.value.a.trim()}`)
    if (parsed.value.b.trim()) lines.push(`${labelB}: ${parsed.value.b.trim()}`)
    return lines.join('\n')
  }
  return typeof parsed.value === 'string' ? parsed.value : ''
}
