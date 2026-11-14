import { useEffect, useState } from 'react'
import { CheckStatus } from '../types/checkStatus.js'
import { runChecks } from '../utils/checks.js'

/**
 * Runs the checks of the step on `code` whenever it changes, unless `enabled` is false. `results` stay those of
 * the last run of the same step until the next run ends; `solved` is only true for the current code.
 */
export function useChecks(level, code, openDb, enabled) {
  const [check, setCheck] = useState({ levelId: null, code: null, results: null })

  useEffect(() => {
    if (!enabled) return
    let active = true
    runChecks(level, code, { openDb })
      .then((results) => active && setCheck({ levelId: level.id, code, results }))
      .catch(() => active && setCheck({ levelId: level.id, code, results: [] }))
    return () => {
      active = false
    }
  }, [level, code, openDb, enabled])

  const sameStep = check.levelId === level.id
  const results = sameStep ? check.results : null
  const solved = sameStep && check.code === code && results.length > 0 && results.every((r) => r.status === CheckStatus.Pass)

  return { results, solved }
}
