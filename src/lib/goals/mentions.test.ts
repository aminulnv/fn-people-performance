import { describe, expect, it } from 'vitest'
import {
  displayMentionText,
  filterMentionCandidates,
  formatMentionToken,
  insertMention,
  mentionedIdsIn,
  mentionQueryAt,
  resolveMentionedPeople,
  splitCommentMentions,
} from './mentions'

const people = [
  { id: '1', name: 'Aminul Islam Borhan', title: 'Product' },
  { id: '2', name: 'Line Manager' },
  { id: '3', name: 'HR Partner' },
]

describe('goal comment mentions', () => {
  it('detects an @ query at the cursor', () => {
    expect(mentionQueryAt('Please see @Lin', 15)).toEqual({
      start: 11,
      query: 'Lin',
    })
    expect(mentionQueryAt('Please see @[Line Manager](2) later', 29)).toBeNull()
    expect(mentionQueryAt('No tag here', 11)).toBeNull()
  })

  it('inserts a structured mention token', () => {
    expect(insertMention('Please see @Lin', 15, people[1])).toEqual({
      text: 'Please see @[Line Manager](2) ',
      cursor: 30,
    })
    expect(formatMentionToken(people[1])).toBe('@[Line Manager](2)')
  })

  it('filters people by name or title', () => {
    expect(filterMentionCandidates(people, 'line').map((person) => person.id)).toEqual([
      '2',
    ])
    expect(filterMentionCandidates(people, 'product').map((person) => person.id)).toEqual([
      '1',
    ])
  })

  it('resolves tokens and bare @names', () => {
    expect(
      resolveMentionedPeople(
        'Hey @[Line Manager](2) and @HR Partner — thanks',
        people,
      ).map((person) => person.id),
    ).toEqual(['2', '3'])
  })

  it('keeps stored mention ids that still exist', () => {
    expect(mentionedIdsIn('plain note', people, ['2', 'missing'])).toEqual(['2'])
  })

  it('splits comment text into mention links', () => {
    const parts = splitCommentMentions('Hey @[Line Manager](2), please review', people)
    expect(parts).toEqual([
      { kind: 'text', value: 'Hey ' },
      { kind: 'mention', person: people[1] },
      { kind: 'text', value: ', please review' },
    ])
    expect(displayMentionText('Hey @[Line Manager](2)')).toBe('Hey @Line Manager')
  })
})
