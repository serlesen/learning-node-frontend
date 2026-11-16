import { describe, expect, it, vi } from 'vitest'
import { Outcome } from '../types/outcome.js'
import { compilePath, createExpress } from './express.js'

const setup = () => {
  const onError = vi.fn()
  const { express } = createExpress(onError)
  return { app: express(), express, onError }
}

const send = (app, method, url, { body, headers } = {}) =>
  app.handle({
    method,
    url,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? '' : JSON.stringify(body),
  })

describe('express', () => {
  describe('compilePath', () => {
    it('reads the parameters of a route, decoded', () => {
      expect(compilePath('/bricks/:id')('/bricks/a%20b')).toEqual({ params: { id: 'a b' }, matched: '/bricks/a%20b' })
    })

    it('ignores the case and a trailing slash', () => {
      expect(compilePath('/bricks')('/Bricks/')).not.toBeNull()
    })

    it('matches the whole path for a route and a prefix for middleware', () => {
      expect(compilePath('/bricks')('/bricks/1')).toBeNull()
      expect(compilePath('/bricks', { prefix: true })('/bricks/1')).not.toBeNull()
      expect(compilePath('/bricks', { prefix: true })('/brickset')).toBeNull()
    })
  })

  describe('routes', () => {
    it('answers with the route matching the method and the path', async () => {
      const { app } = setup()
      app.get('/hello', (req, res) => res.send('hi'))
      app.post('/hello', (req, res) => res.status(201).send('created'))

      const response = await send(app, 'POST', '/hello')

      expect(response).toMatchObject({ outcome: Outcome.Answered, status: 201, body: 'created' })
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
    })

    it('answers 404 Cannot GET when no route matches', async () => {
      const { app } = setup()

      expect(await send(app, 'GET', '/nope')).toMatchObject({ status: 404, body: 'Cannot GET /nope' })
    })

    it('gives the route parameters and the query as strings', async () => {
      const { app } = setup()
      app.get('/bricks/:id', (req, res) => res.json({ params: req.params, query: req.query }))

      const response = await send(app, 'GET', '/bricks/3?color=red&tag=a&tag=b')

      expect(JSON.parse(response.body)).toEqual({ params: { id: '3' }, query: { color: 'red', tag: ['a', 'b'] } })
    })

    it('sends JSON with its content type', async () => {
      const { app } = setup()
      app.get('/shop', (req, res) => res.json({ open: true }))

      const response = await send(app, 'GET', '/shop')

      expect(response.body).toBe('{"open":true}')
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    })

    it('sends no body with a 204', async () => {
      const { app } = setup()
      app.delete('/bricks/:id', (req, res) => res.status(204).json({ deleted: true }))

      expect(await send(app, 'DELETE', '/bricks/1')).toMatchObject({ status: 204, body: '' })
    })

    it('waits for an async handler', async () => {
      const { app } = setup()
      app.get('/slow', async (req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        res.send('done')
      })

      expect(await send(app, 'GET', '/slow')).toMatchObject({ status: 200, body: 'done' })
    })
  })

  describe('body', () => {
    it('leaves req.body undefined without express.json()', async () => {
      const { app } = setup()
      app.post('/echo', (req, res) => res.json({ body: req.body ?? 'none' }))

      expect((await send(app, 'POST', '/echo', { body: { a: 1 } })).body).toBe('{"body":"none"}')
    })

    it('parses a JSON body with express.json()', async () => {
      const { app, express } = setup()
      app.use(express.json())
      app.post('/echo', (req, res) => res.json(req.body))

      expect((await send(app, 'POST', '/echo', { body: { a: 1 } })).body).toBe('{"a":1}')
    })

    it('answers 400 for a broken JSON body', async () => {
      const { app, express } = setup()
      app.use(express.json())
      app.post('/echo', (req, res) => res.json(req.body))

      const response = await app.handle({ method: 'POST', url: '/echo', headers: { 'content-type': 'application/json' }, body: '{nope' })

      expect(response.status).toBe(400)
    })
  })

  describe('middleware', () => {
    it('runs middleware in order and goes on with next()', async () => {
      const { app } = setup()
      const seen = []
      app.use((req, res, next) => {
        seen.push('logger')
        next()
      })
      app.get('/bricks', (req, res) => res.send('ok'))

      expect((await send(app, 'GET', '/bricks')).status).toBe(200)
      expect(seen).toEqual(['logger'])
    })

    it('reports no response when a handler neither answers nor calls next()', async () => {
      const { app } = setup()
      app.use(() => {})
      app.get('/bricks', (req, res) => res.send('ok'))

      expect(await send(app, 'GET', '/bricks')).toMatchObject({ outcome: Outcome.NoResponse })
    })

    it('runs route-level middleware before the handler', async () => {
      const { app } = setup()
      const guard = (req, res, next) => (req.get('x-api-key') ? next() : res.status(401).json({ error: 'no key' }))
      app.delete('/bricks/:id', guard, (req, res) => res.sendStatus(204))

      expect((await send(app, 'DELETE', '/bricks/1')).status).toBe(401)
      expect((await send(app, 'DELETE', '/bricks/1', { headers: { 'X-API-Key': 'k' } })).status).toBe(204)
    })

    it('strips the mount path for a router', async () => {
      const { app, express } = setup()
      const router = express.Router()
      router.get('/:id', (req, res) => res.json({ path: req.path, id: req.params.id }))
      app.use('/bricks', router)

      expect(JSON.parse((await send(app, 'GET', '/bricks/7')).body)).toEqual({ path: '/7', id: '7' })
      expect((await send(app, 'GET', '/orders/7')).status).toBe(404)
    })
  })

  describe('errors', () => {
    it('answers 500 with the error and reports it when nothing handles it', async () => {
      const { app, onError } = setup()
      app.get('/boom', () => {
        throw new TypeError('bad')
      })

      expect(await send(app, 'GET', '/boom')).toMatchObject({ status: 500, body: 'TypeError: bad' })
      expect(onError).toHaveBeenCalledOnce()
    })

    it('sends thrown errors, rejections and next(error) to the error handler', async () => {
      const { app } = setup()
      app.get('/throw', () => {
        throw new Error('a')
      })
      app.get('/reject', async () => {
        throw new Error('b')
      })
      app.get('/next', (req, res, next) => next(new Error('c')))
      app.use((err, req, res, next) => res.status(500).json({ error: err.message, next: typeof next }))

      for (const [url, message] of [['/throw', 'a'], ['/reject', 'b'], ['/next', 'c']]) {
        expect(JSON.parse((await send(app, 'GET', url)).body)).toEqual({ error: message, next: 'function' })
      }
    })

    it('skips error handlers when there is no error', async () => {
      const { app } = setup()
      app.use((err, req, res, next) => res.status(500).send(`error ${typeof next}`))
      app.get('/ok', (req, res) => res.send('ok'))

      expect((await send(app, 'GET', '/ok')).body).toBe('ok')
    })

    it('reports a response sent twice and keeps the first one', async () => {
      const { app, onError } = setup()
      app.get('/twice', (req, res) => {
        res.status(404).json({ error: 'missing' })
        res.json({ found: true })
      })

      expect(await send(app, 'GET', '/twice')).toMatchObject({ status: 404, body: '{"error":"missing"}' })
      expect(onError.mock.calls[0][0].message).toBe('Cannot set headers after they are sent to the client')
    })
  })
})
