import { Outcome } from '../types/outcome.js'
import { DEFAULT_PORT } from './host.js'
import { createRequest } from './request.js'
import { createResponse } from './response.js'

/** How long an `async` handler may take before the request is given up. */
export const REQUEST_TIMEOUT = 2000
/** How long a handler that returned without answering gets to answer from a timer. */
const GRACE = 50

const ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all']

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const isThenable = (value) => typeof value?.then === 'function'
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Compiles an Express path (`/bricks/:id`) into a matcher. Routes match the whole path, mounted middleware
 * (`app.use('/api', …)`) matches a prefix. Both ignore case and a trailing slash, like Express does by default.
 * @returns {(path: string) => { params: Record<string, string>, matched: string } | null}
 */
export function compilePath(path, { prefix = false } = {}) {
  const names = []
  const trimmed = path.replace(/\/+$/, '')
  const source = trimmed
    .split('/')
    .map((segment) =>
      segment.replace(/:(\w+)|([^:]+)/g, (_, name, text) => {
        if (name) {
          names.push(name)
          return '([^/]+?)'
        }
        return escape(text)
      }),
    )
    .join('/')
  const regex = new RegExp(`^${source}${prefix ? '(?=/|$)' : '/?$'}`, 'i')

  return (target) => {
    const match = regex.exec(target)
    if (!match) return null
    const params = {}
    names.forEach((name, i) => {
      try {
        params[name] = decodeURIComponent(match[i + 1])
      } catch {
        params[name] = match[i + 1]
      }
    })
    return { params, matched: match[0] }
  }
}

function bodyParseError(error) {
  const parseError = new SyntaxError(error.message)
  parseError.status = 400
  parseError.type = 'entity.parse.failed'
  return parseError
}

/** `express.json()`: turns a JSON body into `req.body`. Without it, `req.body` stays `undefined`. */
function json() {
  return function jsonParser(req, res, next) {
    const type = req.get('content-type') ?? ''
    if (!type.includes('json') || !req.rawBody) return next()
    try {
      req.body = JSON.parse(req.rawBody)
    } catch (error) {
      return next(bodyParseError(error))
    }
    next()
  }
}

const passThrough = () => (req, res, next) => next()

/**
 * Runs the layers matching the request, in order, the way Express does: a handler answers, calls `next()` to go
 * on, or `next(error)` / throws / rejects to jump to the error handlers (the ones with 4 parameters).
 * @returns {Promise<{ error: unknown, hasError: boolean, outcome: string | null }>} `outcome` is set when the
 * request stopped without an answer.
 */
async function runStack(stack, req, res, state, onLateError) {
  for (const layer of stack) {
    if (res.finished) break
    if (layer.method && layer.method !== req.method && layer.method !== 'ALL') continue
    const match = layer.match(req.path)
    if (!match) continue
    const isErrorHandler = layer.handler.length === 4
    if (state.hasError !== isErrorHandler) continue

    const savedPath = req.path
    const savedBase = req.baseUrl
    if (layer.method) req.params = match.params
    else if (layer.mounted) {
      req.baseUrl = savedBase + match.matched
      req.path = req.path.slice(match.matched.length) || '/'
    }

    let called = null
    let wake
    const woken = new Promise((resolve) => (wake = resolve))
    const next = (error) => {
      if (called) return
      called = { error }
      wake()
    }
    res.onAnswer = wake

    let thrown = null
    try {
      const out = isErrorHandler ? layer.handler(state.error, req, res, next) : layer.handler(req, res, next)
      if (isThenable(out)) {
        const settled = await Promise.race([
          Promise.resolve(out).then(() => null, (error) => ({ error })),
          wait(REQUEST_TIMEOUT).then(() => ({ timeout: true })),
        ])
        if (settled?.timeout && !res.finished && !called) return { ...state, outcome: Outcome.Timeout }
        if (settled && 'error' in settled) thrown = settled
      }
    } catch (error) {
      thrown = { error }
    } finally {
      req.path = savedPath
      req.baseUrl = savedBase
    }

    if (thrown) {
      if (res.finished) onLateError(thrown.error)
      else state = { error: thrown.error, hasError: true }
      continue
    }
    if (res.finished) break
    if (!called) await Promise.race([woken, wait(GRACE)])
    if (res.finished) break
    if (!called) return { ...state, outcome: Outcome.NoResponse }
    const { error } = called
    if (error !== undefined && error !== null && error !== 'route' && error !== 'router') {
      state = { error, hasError: true }
    }
  }
  return { ...state, outcome: null }
}

function createRouter(owner) {
  const stack = []

  const router = function router(req, res, next) {
    return runStack(stack, req, res, { error: null, hasError: false }, owner.onLateError).then((result) => {
      if (result.outcome || res.finished) return
      next(result.hasError ? result.error : undefined)
    })
  }

  router.stack = stack
  for (const name of ROUTE_METHODS) {
    router[name] = (path, ...handlers) => {
      if (name === 'get' && handlers.length === 0) return owner.settings?.[path]
      const match = compilePath(String(path))
      for (const handler of handlers.flat()) stack.push({ method: name.toUpperCase(), match, handler })
      return router
    }
  }
  router.use = (...args) => {
    const path = typeof args[0] === 'string' ? args.shift() : '/'
    const mounted = path !== '/'
    const match = compilePath(path, { prefix: true })
    for (const handler of args.flat()) stack.push({ method: null, mounted, match, handler })
    return router
  }
  router.route = (path) => {
    const chain = {}
    for (const name of ROUTE_METHODS) {
      chain[name] = (...handlers) => {
        router[name](path, ...handlers)
        return chain
      }
    }
    return chain
  }
  return router
}

function defaultErrorResponse(res, error) {
  const status = Number(error?.status ?? error?.statusCode)
  res.statusCode = status >= 400 && status < 600 ? status : 500
  const text = error instanceof Error || error?.message ? `${error.name ?? 'Error'}: ${error.message}` : String(error)
  res.set('content-type', 'text/html; charset=utf-8')
  res.end(text)
}

/**
 * A fresh `express` function for one run of the student's code: every app it creates is recorded in `apps`, and
 * `listen` records the port.
 * @param {(error: unknown) => void} onError errors that Express would print in the terminal
 */
export function createExpress(onError) {
  const apps = []

  function express() {
    const owner = { settings: {}, onLateError: onError, port: null }
    const app = createRouter(owner)
    app.locals = {}
    app.settings = owner.settings
    app.set = (name, value) => {
      owner.settings[name] = value
      return app
    }
    app.listen = (port, callback) => {
      owner.port = Number(port) || DEFAULT_PORT
      if (typeof callback === 'function') callback()
      return { close: () => {} }
    }
    app.port = () => owner.port

    /**
     * Sends one request through the app and resolves with what the client receives.
     * @param {import('../types/entities.js').RequestSpec} spec
     * @returns {Promise<import('../types/entities.js').HttpResponse>}
     */
    app.handle = async (spec) => {
      const started = performance.now()
      const req = createRequest(spec)
      const res = createResponse(() => res.onAnswer?.())
      req.res = res
      res.req = req
      const result = await runStack(app.stack, req, res, { error: null, hasError: false }, onError)
      const ms = Math.round(performance.now() - started)
      if (result.outcome) return { outcome: result.outcome, method: req.method, path: req.path, ms }
      if (!res.finished) {
        if (result.hasError) {
          onError(result.error)
          defaultErrorResponse(res, result.error)
        } else {
          res.statusCode = 404
          res.set('content-type', 'text/html; charset=utf-8')
          res.end(`Cannot ${req.method} ${req.path}`)
        }
      }
      return {
        outcome: Outcome.Answered,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        headers: { ...res.headers },
        body: res.body,
        ms,
      }
    }

    apps.push(app)
    return app
  }

  express.json = json
  express.urlencoded = passThrough
  express.static = passThrough
  express.Router = () => createRouter({ settings: {}, onLateError: onError })

  return { express, apps }
}
