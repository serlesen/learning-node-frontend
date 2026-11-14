import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLiveServer } from './useLiveServer.js'

const CODE = `const express = require('express')
const db = require('./db')
const app = express()
app.get('/bricks', async (req, res) => res.json(await db.all('SELECT 1')))
`

const fakeDb = () => ({ api: { all: async () => [] }, close: vi.fn() })

const render = (props) =>
  renderHook((p) => useLiveServer(p.code, p.runId, p.openDb, p.enabled), { initialProps: { code: CODE, runId: 0, enabled: true, ...props } })

const query = (server) => server.handle({ method: 'GET', url: '/bricks', headers: {}, body: '' })

describe('useLiveServer', () => {
  describe('server', () => {
    it('is null while disabled', () => {
      const { result } = render({ enabled: false })

      expect(result.current).toEqual({ live: null, server: null })
    })

    it('keeps the same server, and its database open, while nothing changes', async () => {
      const db = fakeDb()
      const openDb = () => db
      const { result, rerender } = render({ openDb })
      const { server } = result.current

      await query(server)
      rerender({ code: CODE, runId: 0, enabled: true, openDb })

      expect(result.current.server).toBe(server)
      expect(db.close).not.toHaveBeenCalled()
    })
  })

  describe('restart', () => {
    it('starts a new server on Run and closes the database of the previous one', async () => {
      const db = fakeDb()
      const openDb = () => db
      const { result, rerender } = render({ openDb })
      const first = result.current.server
      await query(first)

      rerender({ code: CODE, runId: 1, enabled: true, openDb })

      expect(result.current.server).not.toBe(first)
      expect(db.close).toHaveBeenCalledOnce()
    })

    it('closes the database when unmounted', async () => {
      const db = fakeDb()
      const { result, unmount } = render({ openDb: () => db })
      await query(result.current.server)

      unmount()

      expect(db.close).toHaveBeenCalledOnce()
    })
  })
})
