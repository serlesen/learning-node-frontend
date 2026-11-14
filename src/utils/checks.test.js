import { describe, expect, it } from 'vitest'
import { CheckStatus } from '../types/checkStatus.js'
import { RunError } from '../types/runError.js'
import { runChecks, toRequestSpec } from './checks.js'

const CODE = `const express = require('express')
const app = express()
app.use(express.json())
const bricks = []
app.post('/bricks', (req, res) => {
  bricks.push(req.body)
  res.status(201).json({ count: bricks.length })
})
app.get('/boom', () => {
  throw new Error('boom')
})
`

const level = (checks) => ({ id: 'test', checks })

describe('checks', () => {
  describe('toRequestSpec', () => {
    it('sends a body object as JSON', () => {
      expect(toRequestSpec('POST', '/bricks', { body: { a: 1 }, headers: { 'X-Test': '1' } })).toEqual({
        method: 'POST',
        url: '/bricks',
        headers: { 'Content-Type': 'application/json', 'X-Test': '1' },
        body: '{"a":1}',
      })
    })

    it('sends no body and no content type without a body', () => {
      expect(toRequestSpec('GET', '/bricks')).toEqual({ method: 'GET', url: '/bricks', headers: {}, body: '' })
    })
  })

  describe('runChecks', () => {
    it('gives every check a fresh server', async () => {
      const once = async (ctx) => (await ctx.post('/bricks', { name: 'a' })).json.count === 1
      const results = await runChecks(level([{ key: 'a', test: once }, { key: 'b', test: once }]), CODE)

      expect(results).toEqual([
        { key: 'a', status: CheckStatus.Pass },
        { key: 'b', status: CheckStatus.Pass },
      ])
    })

    it('attaches the first server error to a failed check', async () => {
      const results = await runChecks(level([{ key: 'a', test: async (ctx) => (await ctx.get('/boom')).status === 200 }]), CODE)

      expect(results[0]).toMatchObject({ status: CheckStatus.Fail, error: { message: 'boom' } })
    })

    it('reports an error for every check when the server does not start', async () => {
      const results = await runChecks(level([{ key: 'a', test: () => true }]), 'const app = ')

      expect(results[0]).toMatchObject({ status: CheckStatus.Error, error: { type: RunError.Syntax } })
    })

    it('reads the code without its comments', async () => {
      const results = await runChecks(level([{ key: 'a', test: (ctx) => !ctx.code.includes('secret') }]), `${CODE}// secret`)

      expect(results[0].status).toBe(CheckStatus.Pass)
    })
  })
})
