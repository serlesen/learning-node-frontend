import { LogKind } from '../types/logKind.js'
import { LogLevel } from '../types/logLevel.js'
import { RunError } from '../types/runError.js'
import { createExpress } from './express.js'
import { formatValue } from './formatValue.js'
import { DEFAULT_PORT } from './host.js'
import { guardLoops } from './loopGuard.js'

/** @typedef {import('../types/entities.js').RunErrorInfo} RunErrorInfo */
/** @typedef {import('../types/entities.js').ServerLogEntry} ServerLogEntry */

export const MAX_ITERATIONS = 100_000
const GUARD = '__loopGuard'
const LOOP_STOP = Symbol('loopStop')
// `new Function` adds two lines before the body: `function anonymous(…` and `) {`.
const FUNCTION_HEADER_LINES = 2

// Browser globals that don't exist in Node: hidden from the student's code, which also keeps it away from the app.
const HIDDEN = ['window', 'document', 'globalThis', 'self', 'localStorage', 'sessionStorage', 'alert', 'fetch', 'XMLHttpRequest']

function errorLine(error) {
  const stack = String(error?.stack ?? '')
  const v8 = stack.match(/<anonymous>:(\d+):\d+/)
  if (v8) return Number(v8[1]) - FUNCTION_HEADER_LINES
  const firefox = stack.match(/> Function:(\d+):\d+/)
  return firefox ? Number(firefox[1]) : undefined
}

/**
 * @param {unknown} error
 * @param {string} type
 * @returns {RunErrorInfo}
 */
export function toRunError(error, type) {
  if (error?.[LOOP_STOP]) return { type: RunError.InfiniteLoop, line: errorLine(error) }
  const isError = typeof error === 'object' && error !== null && 'message' in error
  return {
    type,
    name: isError ? String(error.name ?? 'Error') : 'Error',
    message: isError ? String(error.message) : formatValue(error),
    line: errorLine(error),
  }
}

function createGuard() {
  let iterations = 0
  return {
    guard: () => {
      if (++iterations > MAX_ITERATIONS) {
        const stop = new Error('loop')
        stop[LOOP_STOP] = true
        throw stop
      }
      return true
    },
    reset: () => (iterations = 0),
  }
}

function createConsole(log) {
  const write = (level) => (...args) => log({ kind: LogKind.Console, level, text: args.map(formatValue).join(' ') })
  const methods = {
    log: write(LogLevel.Log),
    info: write(LogLevel.Log),
    debug: write(LogLevel.Log),
    table: write(LogLevel.Log),
    dir: write(LogLevel.Log),
    warn: write(LogLevel.Warn),
    error: write(LogLevel.Error),
  }
  return new Proxy(methods, { get: (target, name) => target[name] ?? (() => {}) })
}

function moduleNotFound(name) {
  const error = new Error(`Cannot find module '${name}'`)
  error.code = 'MODULE_NOT_FOUND'
  return error
}

/**
 * Starts the student's `server.js`: runs it once, with `require('express')` and `require('./db')`, and keeps the
 * app it created. Every request then goes through `server.handle`, on the same app and the same database, until the
 * code changes.
 * @param {string} code
 * @param {{ openDb?: () => import('../types/entities.js').ShopDatabase }} [options] `openDb` opens a fresh database
 * the first time the code queries it
 * @returns {import('../types/entities.js').ServerStart}
 */
export function startServer(code, { openDb } = {}) {
  const logs = []
  let sink = (entry) => logs.push(entry)
  const log = (entry) => sink(entry)
  const logError = (error) => log({ kind: LogKind.Error, error: toRunError(error, RunError.Runtime) })
  const { guard, reset } = createGuard()
  const { express, apps } = createExpress(logError)
  let database = null
  let required = false
  const openDatabase = () => (database ??= openDb())
  // The database only opens on its first query, so starting a server holds nothing that must be closed.
  const dbApi = {
    all: (...args) => openDatabase().api.all(...args),
    get: (...args) => openDatabase().api.get(...args),
    run: (...args) => openDatabase().api.run(...args),
  }

  const require = (name) => {
    if (name === 'express') return express
    if (name === './db' || name === './db.js') {
      if (!openDb) throw moduleNotFound(name)
      required = true
      return dbApi
    }
    throw moduleNotFound(name)
  }
  const module = { exports: {} }
  const process = { env: { PORT: String(DEFAULT_PORT), NODE_ENV: 'development' } }
  const params = ['require', 'module', 'exports', 'console', 'process', GUARD, ...HIDDEN]
  const args = [require, module, module.exports, createConsole(log), process, guard, ...HIDDEN.map(() => undefined)]

  const stopped = (error) => ({ error, logs, server: null })

  let compiled
  try {
    compiled = new Function(...params, guardLoops(code, GUARD))
  } catch (error) {
    return stopped(toRunError(error, RunError.Syntax))
  }
  try {
    compiled(...args)
  } catch (error) {
    return stopped(toRunError(error, RunError.Runtime))
  }

  const app = apps.find((a) => a.port() !== null) ?? apps[0]
  if (!app) return stopped({ type: RunError.NoApp })

  /** @type {import('../types/entities.js').Server} */
  const server = {
    port: app.port() ?? DEFAULT_PORT,
    database: ({ open = false } = {}) => (open && required ? openDatabase() : database),
    // Requests are sent one at a time: the logs of one go to the request being handled.
    handle: (spec) => {
      const requestLogs = []
      sink = (entry) => requestLogs.push(entry)
      reset()
      return app.handle(spec).then((response) => ({ response, logs: requestLogs }))
    },
  }
  return { error: null, logs, server }
}
