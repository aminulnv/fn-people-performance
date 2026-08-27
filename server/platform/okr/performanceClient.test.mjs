import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HttpError } from '../../errors.mjs'
import {
  fetchPerformanceEmployeeKrs,
  normalizeHrEmployeeId,
  okrApiConfigured,
} from './performanceClient.mjs'

describe('normalizeHrEmployeeId', () => {
  it('strips an NXT prefix and keeps a positive HR id', () => {
    assert.equal(normalizeHrEmployeeId('NXT871'), 871)
    assert.equal(normalizeHrEmployeeId('871'), 871)
    assert.equal(normalizeHrEmployeeId(871), 871)
  })

  it('rejects empty or invalid ids', () => {
    assert.equal(normalizeHrEmployeeId(''), null)
    assert.equal(normalizeHrEmployeeId('NXT'), null)
    assert.equal(normalizeHrEmployeeId('abc'), null)
    assert.equal(normalizeHrEmployeeId(0), null)
  })
})

describe('fetchPerformanceEmployeeKrs', () => {
  it('is unconfigured without a server secret', () => {
    assert.equal(okrApiConfigured({}), false)
    assert.equal(
      okrApiConfigured({ PERFORMANCE_OKR_API_KEY: ' secret ' }),
      true,
    )
  })

  it('sends the API key from the server env and prefers employeeId', async () => {
    const calls = []
    const fetchImpl = async (url, options) => {
      calls.push({ url, options })
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            employee: { employeeId: 871 },
            filter: { quarter: '2026-Q3' },
            quarters: [],
          }),
      }
    }

    const body = await fetchPerformanceEmployeeKrs(
      {
        employeeId: 'NXT871',
        email: 'saif.alam@nextventures.io',
        quarter: '2026-Q3',
      },
      {
        PERFORMANCE_OKR_API_KEY: 'server-secret',
        PERFORMANCE_OKR_API_URL: 'https://okr.example.test',
      },
      fetchImpl,
    )

    assert.equal(body.employee.employeeId, 871)
    assert.equal(calls.length, 1)
    assert.equal(
      calls[0].url,
      'https://okr.example.test/api/integrations/performance/employee-krs?employeeId=871&quarter=2026-Q3',
    )
    assert.equal(calls[0].options.headers.Authorization, 'Bearer server-secret')
    assert.equal(
      String(calls[0].url).includes('saif.alam'),
      false,
      'do not send both identifiers',
    )
  })

  it('maps the upstream JSON error body', async () => {
    await assert.rejects(
      () =>
        fetchPerformanceEmployeeKrs(
          { email: 'missing@nextventures.io' },
          { PERFORMANCE_OKR_API_KEY: 'server-secret' },
          async () => ({
            ok: false,
            status: 404,
            text: async () =>
              JSON.stringify({
                error: { code: 'not_found', message: 'Employee not found' },
              }),
          }),
        ),
      (error) => {
        assert.equal(error instanceof HttpError, true)
        assert.equal(error.statusCode, 404)
        assert.equal(error.publicMessage, 'Employee not found')
        return true
      },
    )
  })
})
