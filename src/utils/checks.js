import { CheckStatus } from '../types/checkStatus.js'
import { HttpMethod } from '../types/httpMethod.js'
import { LogKind } from '../types/logKind.js'
import { Outcome } from '../types/outcome.js'
import { RunError } from '../types/runError.js'
import { parseJson } from './body.js'
import { stripComments } from './scan.js'
import { startServer, toRunError } from './server.js'

/** @typedef {import('../types/entities.js').Level} Level */
/** @typedef {import('../types/entities.js').CheckContext} CheckContext */
/** @typedef {import('../types/entities.js').CheckResult} CheckResult */

/**
 * Builds the request a check or the client sends: a body object is sent as JSON.
 * @returns {import('../types/entities.js').RequestSpec}
 */
export function toRequestSpec(method, url, { body, headers = {} } = {}) {
  if (body === undefined) return { method, url, headers, body: '' }
  return {
    method,
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }
}

/** @returns {CheckContext} */
function createContext(server, code) {
  const ctx = {
    code: stripComments(code),
    logs: [],
    errors: [],
    request: (method, url, options) =>
      server.handle(toRequestSpec(method, url, options)).then(({ response, logs }) => {
        for (const entry of logs) {
          if (entry.kind === LogKind.Console) ctx.logs.push(entry)
          if (entry.kind === LogKind.Error) ctx.errors.push(entry.error)
        }
        return { ...response, json: response.outcome === Outcome.Answered ? parseJson(response.body) : undefined }
      }),
    get: (url, options) => ctx.request(HttpMethod.Get, url, options),
    post: (url, body, options) => ctx.request(HttpMethod.Post, url, { ...options, body }),
    put: (url, body, options) => ctx.request(HttpMethod.Put, url, { ...options, body }),
    patch: (url, body, options) => ctx.request(HttpMethod.Patch, url, { ...options, body }),
    delete: (url, options) => ctx.request(HttpMethod.Delete, url, options),
    query: (sql) => server.database({ open: true })?.query(sql) ?? [],
  }
  return ctx
}

/**
 * Runs every check of the step, each one on a freshly started server with fresh data, one after the other.
 * @param {Level} level
 * @param {string} code
 * @param {{ openDb?: () => import('../types/entities.js').ShopDatabase }} [options]
 * @returns {Promise<CheckResult[]>}
 */
export async function runChecks(level, code, options = {}) {
  const results = []
  for (const check of level.checks) {
    const started = startServer(code, options)
    if (started.error) {
      results.push({ key: check.key, status: CheckStatus.Error, error: started.error })
      continue
    }
    const ctx = createContext(started.server, code)
    try {
      const ok = Boolean(await check.test(ctx))
      results.push(ok ? { key: check.key, status: CheckStatus.Pass } : { key: check.key, status: CheckStatus.Fail, error: ctx.errors[0] })
    } catch (error) {
      results.push({ key: check.key, status: CheckStatus.Error, error: toRunError(error, RunError.Runtime) })
    } finally {
      started.server.database()?.close()
    }
  }
  return results
}
