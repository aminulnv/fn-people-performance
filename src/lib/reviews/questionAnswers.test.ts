import { describe, expect, it } from 'vitest'
import {
  formatAnswerForDisplay,
  parseAnswer,
  serializeAnswer,
} from './questionAnswers'

describe('questionAnswers', () => {
  it('treats missing kind as open-ended plain text', () => {
    expect(parseAnswer(undefined, 'Hello')).toEqual({
      kind: 'open_ended',
      value: 'Hello',
    })
    expect(serializeAnswer(undefined, 'Hello')).toBe('Hello')
  })

  it('round-trips yes/no answers', () => {
    expect(parseAnswer('yes_no', 'yes')).toEqual({ kind: 'yes_no', value: 'yes' })
    expect(parseAnswer('yes_no', 'maybe')).toEqual({ kind: 'yes_no', value: '' })
    expect(serializeAnswer('yes_no', 'no')).toBe('no')
    expect(serializeAnswer('yes_no', 'maybe')).toBe('')
  })

  it('stores multiple choice as the option string', () => {
    expect(parseAnswer('multiple_choice', 'Exceeding')).toEqual({
      kind: 'multiple_choice',
      value: 'Exceeding',
    })
    expect(serializeAnswer('multiple_choice', 'Exceeding')).toBe('Exceeding')
  })

  it('round-trips dual text as JSON', () => {
    const body = serializeAnswer('dual_text', { a: 'Strong', b: 'Improve' })
    expect(body).toBe('{"a":"Strong","b":"Improve"}')
    expect(parseAnswer('dual_text', body)).toEqual({
      kind: 'dual_text',
      value: { a: 'Strong', b: 'Improve' },
    })
  })

  it('falls back legacy plain text into the first dual field', () => {
    expect(parseAnswer('dual_text', 'Legacy note')).toEqual({
      kind: 'dual_text',
      value: { a: 'Legacy note', b: '' },
    })
  })

  it('formats answers for read-only display', () => {
    expect(formatAnswerForDisplay('yes_no', 'yes')).toBe('Yes')
    expect(
      formatAnswerForDisplay('dual_text', '{"a":"A","b":"B"}', [
        'Strengths',
        'Improve',
      ]),
    ).toBe('Strengths: A\nImprove: B')
  })
})
