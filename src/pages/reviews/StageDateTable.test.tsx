import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { END_BEFORE_START_MESSAGE, StageWindowFields } from './StageDateTable'

afterEach(() => {
  cleanup()
})

describe('StageWindowFields', () => {
  it('blocks end dates before the start date in the picker', () => {
    render(
      <StageWindowFields
        startLabel="Opens"
        endLabel="Closes"
        startValue="2026-07-21T09:00"
        endValue="2026-07-28T17:00"
        onStartChange={() => {}}
        onEndChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByLabelText('Closes'))
    expect(screen.getByRole('button', { name: '20' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '21' })).not.toBeDisabled()
  })

  it('blocks start dates after the end date in the picker', () => {
    render(
      <StageWindowFields
        startLabel="Opens"
        endLabel="Closes"
        startValue="2026-07-21T09:00"
        endValue="2026-07-28T17:00"
        onStartChange={() => {}}
        onEndChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByLabelText('Opens'))
    expect(screen.getByRole('button', { name: '31' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '28' })).not.toBeDisabled()
  })

  it('shows an error when the end is before the start', () => {
    render(
      <StageWindowFields
        startLabel="Opens"
        endLabel="Closes"
        startValue="2026-07-21T09:00"
        endValue="2026-07-20T17:00"
        onStartChange={() => {}}
        onEndChange={() => {}}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(END_BEFORE_START_MESSAGE)
  })
})
