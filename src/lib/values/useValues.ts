import { useEffect, useState } from 'react'
import {
  ensureValuesLoaded,
  getEnabledValues,
  getValueById,
  getValuesSnapshot,
  subscribeValuesStore,
} from './store'
import type { CompanyValue } from './types'

export function useValuesLibrary() {
  const [values, setValues] = useState<CompanyValue[]>(() => getValuesSnapshot())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void ensureValuesLoaded().catch(() => {
      /* values stay empty until retry */
    })
  }, [])

  useEffect(() => subscribeValuesStore(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    void tick
    setValues(getValuesSnapshot())
  }, [tick])

  return { values }
}

export function useEnabledValues(options?: { load?: boolean }) {
  const shouldLoad = options?.load !== false
  const [values, setValues] = useState<CompanyValue[]>(() => getEnabledValues())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!shouldLoad) return
    void ensureValuesLoaded().catch(() => {
      /* values stay empty until retry */
    })
  }, [shouldLoad])

  useEffect(() => subscribeValuesStore(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    void tick
    setValues(getEnabledValues())
  }, [tick])

  return values
}

export function useCompanyValue(valueId: string) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void ensureValuesLoaded().catch(() => {
      /* values stay empty until retry */
    })
  }, [])

  useEffect(() => subscribeValuesStore(() => setTick((n) => n + 1)), [])

  void tick
  return valueId ? getValueById(valueId) : null
}
