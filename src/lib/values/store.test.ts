import { describe, expect, it, beforeEach } from 'vitest'
import {
  createCompanyValue,
  getEnabledValues,
  getValuesSnapshot,
  resetValuesStoreForTests,
  updateCompanyValue,
} from './store'

beforeEach(() => {
  resetValuesStoreForTests()
})

describe('values store', () => {
  it('seeds the seven company cultural values', () => {
    expect(getValuesSnapshot()).toHaveLength(7)
    expect(getEnabledValues()).toHaveLength(7)
  })

  it('creates a value from the form fields', async () => {
    const created = await createCompanyValue({
      name: 'Customer Obsession',
      description: 'Put the customer first.',
      status: 'enabled',
    })
    expect(created.name).toBe('Customer Obsession')
    expect(created.behaviours).toEqual([])
    expect(getValuesSnapshot()).toHaveLength(8)
  })

  it('updates an existing value and can disable it', async () => {
    const updated = await updateCompanyValue('product-first', {
      name: 'Product First',
      description: 'Updated description.',
      status: 'disabled',
    })
    expect(updated.description).toBe('Updated description.')
    expect(updated.status).toBe('disabled')
    expect(getEnabledValues().some((value) => value.id === 'product-first')).toBe(
      false,
    )
  })

  it('requires a title', async () => {
    await expect(createCompanyValue({ name: '   ' })).rejects.toThrow(
      'Give the value a title.',
    )
  })
})
