import { describe, expect, it, vi } from 'vitest'
import { LogKind } from '../types/logKind.js'
import { LogLevel } from '../types/logLevel.js'
import { RunError } from '../types/runError.js'
import { startServer } from './server.js'

const APP = `const express = require('express')
const app = express()
`

const get = (server, url) => server.handle({ method: 'GET', url, headers: {}, body: '' })

describe('startServer', () => {
  describe('start', () => {
    it('runs the code once and keeps what it logged', () => {
      const { error, logs, server } = startServer(`${APP}app.listen(4000, () => console.log('on', 4000))`)

      expect(error).toBeNull()
      expect(server.port).toBe(4000)
      expect(logs).toEqual([{ kind: LogKind.Console, level: LogLevel.Log, text: 'on 4000' }])
    })

    it('reports a syntax error', () => {
      expect(startServer(`${APP}app.get('/x', (req, res) => {`).error).toMatchObject({ type: RunError.Syntax })
    })

    it('reports a runtime error with its line', () => {
      const { error, server } = startServer(`${APP}\nbricks.push(1)`)

      expect(error).toMatchObject({ type: RunError.Runtime, name: 'ReferenceError', line: 4 })
      expect(server).toBeNull()
    })

    it('reports a missing app', () => {
      expect(startServer("const express = require('express')").error).toEqual({ type: RunError.NoApp })
    })

    it('stops a loop that never ends', () => {
      expect(startServer(`${APP}while (true) {}`).error).toMatchObject({ type: RunError.InfiniteLoop })
    })
  })

  describe('modules', () => {
    it('throws like Node for an unknown module', () => {
      expect(startServer("require('fs')").error).toMatchObject({ message: "Cannot find module 'fs'" })
    })

    it('opens the database once, on the first query', async () => {
      const openDb = vi.fn(() => ({ api: { all: async () => [] } }))
      const { server } = startServer(`${APP}const db = require('./db')
app.get('/bricks', async (req, res) => res.json(await db.all('SELECT 1')))`, { openDb })

      expect(server.database()).toBeNull()
      await get(server, '/bricks')
      await get(server, '/bricks')
      expect(openDb).toHaveBeenCalledOnce()
      expect(server.database()).not.toBeNull()
    })

    it('hides the browser globals', () => {
      const { logs } = startServer(`${APP}console.log(typeof window, typeof document, typeof localStorage)`)

      expect(logs[0].text).toBe('undefined undefined undefined')
    })
  })

  describe('requests', () => {
    it('keeps the state of the app between requests and returns their logs', async () => {
      const { server } = startServer(`${APP}let count = 0
app.get('/count', (req, res) => {
  count++
  console.log('count', count)
  res.json({ count })
})`)

      await get(server, '/count')
      const { response, logs } = await get(server, '/count')

      expect(response.body).toBe('{"count":2}')
      expect(logs).toEqual([{ kind: LogKind.Console, level: LogLevel.Log, text: 'count 2' }])
    })

    it('logs the errors Express reports', async () => {
      const { server } = startServer(`${APP}app.get('/boom', () => {
  throw new Error('boom')
})`)

      const { response, logs } = await get(server, '/boom')

      expect(response.status).toBe(500)
      expect(logs[0]).toMatchObject({ kind: LogKind.Error, error: { type: RunError.Runtime, message: 'boom' } })
    })

    it('stops a loop that never ends inside a route', async () => {
      const { server } = startServer(`${APP}app.get('/loop', (req, res) => {
  while (true) {}
})`)

      const { response, logs } = await get(server, '/loop')

      expect(response.status).toBe(500)
      expect(logs[0].error.type).toBe(RunError.InfiniteLoop)
    })
  })
})
