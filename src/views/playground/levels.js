import { HttpMethod } from '../../types/httpMethod.js'

/** @typedef {import('../../types/entities.js').Level} Level */

const { Get, Post, Put, Patch, Delete } = HttpMethod

const START = `const express = require('express')
const app = express()
`

const START_JSON = `const express = require('express')
const app = express()
app.use(express.json())
`

const START_DB = `const express = require('express')
const db = require('./db')
const app = express()
app.use(express.json())
`

const LISTEN = `
app.listen(3000, () => console.log('Brick Shop API on port 3000'))
`

const BRICKS = `
const bricks = [
  { id: 1, name: 'Classic 2x4', color: 'red', price: 0.25, stock: 120 },
  { id: 2, name: 'Classic 2x2', color: 'blue', price: 0.15, stock: 80 },
  { id: 3, name: 'Plate 1x6', color: 'yellow', price: 0.2, stock: 0 },
  { id: 4, name: 'Slope 2x3', color: 'red', price: 0.3, stock: 45 },
  { id: 5, name: 'Classic 1x1', color: 'white', price: 0.05, stock: 300 },
]
`

const DATA = [
  { id: 1, name: 'Classic 2x4', color: 'red', price: 0.25, stock: 120 },
  { id: 2, name: 'Classic 2x2', color: 'blue', price: 0.15, stock: 80 },
  { id: 3, name: 'Plate 1x6', color: 'yellow', price: 0.2, stock: 0 },
  { id: 4, name: 'Slope 2x3', color: 'red', price: 0.3, stock: 45 },
  { id: 5, name: 'Classic 1x1', color: 'white', price: 0.05, stock: 300 },
]

const NEXT_ID = `let nextId = 6
`

const ORDERS = `
const orders = [
  { id: 1, customer: 'Ana', brickId: 1, quantity: 50 },
  { id: 2, customer: 'Ben', brickId: 4, quantity: 10 },
  { id: 3, customer: 'Chloe', brickId: 2, quantity: 25 },
  { id: 4, customer: 'Farid', brickId: 1, quantity: 30 },
]
`

const GET_LIST = `
app.get('/bricks', (req, res) => {
  res.json(bricks)
})
`

const GET_ONE = `
app.get('/bricks/:id', (req, res) => {
  const brick = bricks.find((b) => b.id === Number(req.params.id))
  if (!brick) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  res.json(brick)
})
`

const POST_BRICK = `
app.post('/bricks', (req, res) => {
  const brick = {
    id: nextId++,
    name: req.body.name,
    color: req.body.color,
    price: req.body.price,
    stock: req.body.stock,
  }
  bricks.push(brick)
  res.status(201).json(brick)
})
`

const DELETE_BRICK = `
app.delete('/bricks/:id', requireKey, (req, res) => {
  const index = bricks.findIndex((b) => b.id === Number(req.params.id))
  if (index === -1) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  bricks.splice(index, 1)
  res.status(204).send()
})
`

const DB_GET_ONE = `
app.get('/bricks/:id', async (req, res) => {
  const brick = await db.get('SELECT * FROM bricks WHERE id = ?', [req.params.id])
  if (!brick) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  res.json(brick)
})
`

const NEW_BRICK = { name: 'Tile 2x2', color: 'green', price: 0.18, stock: 12 }
const DB_BRICK = { name: 'Tile 2x4', color: 'green', price: 0.3, stock: 20 }
const API_KEY = 'brick-secret'

const pretty = (value) => JSON.stringify(value, null, 2)
const sorted = (value) =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]))
      : value
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
const ids = (list) => (Array.isArray(list) ? list.map((item) => item?.id) : null)
const isJson = (response) => Boolean(response.headers?.['content-type']?.includes('application/json'))
const brick = (id) => DATA.find((b) => b.id === id)
const keyHeader = (key) => ({ headers: { 'X-API-Key': key } })

/** @type {Level[]} */
export const levels = [
  {
    id: 'hello',
    concept: 'routes',
    example: `app.get('/ping', (req, res) => {
  res.send('pong')
})`,
    js: `${START}
// {{helloRoute}}
${LISTEN}`,
    solution: `${START}
app.get('/hello', (req, res) => {
  res.send('Brick Shop API')
})
${LISTEN}`,
    requests: [{ method: Get, url: '/hello' }],
    checks: [
      { key: 'answers', test: async (ctx) => (await ctx.get('/hello')).status === 200 },
      { key: 'text', test: async (ctx) => (await ctx.get('/hello')).body === 'Brick Shop API' },
      { key: 'getOnly', test: async (ctx) => (await ctx.post('/hello')).status === 404 },
    ],
  },
  {
    id: 'shop-info',
    concept: 'json',
    example: `res.json({ city: 'Lisbon', bricks: 120 })`,
    js: `${START}
app.get('/shop', (req, res) => {
  // {{sendObject}}
  res.send('Brick Shop, open')
})
${LISTEN}`,
    solution: `${START}
app.get('/shop', (req, res) => {
  res.json({ name: 'Brick Shop', open: true })
})
${LISTEN}`,
    requests: [{ method: Get, url: '/shop' }],
    checks: [
      { key: 'isJson', test: async (ctx) => isJson(await ctx.get('/shop')) },
      { key: 'name', test: async (ctx) => (await ctx.get('/shop')).json?.name === 'Brick Shop' },
      { key: 'open', test: async (ctx) => (await ctx.get('/shop')).json?.open === true },
    ],
  },
  {
    id: 'list-bricks',
    concept: 'collection',
    js: `${START}${BRICKS}
app.get('/bricks', (req, res) => {
  // {{sendBricks}}
})
${LISTEN}`,
    solution: `${START}${BRICKS}
app.get('/bricks', (req, res) => {
  res.json(bricks)
})
${LISTEN}`,
    requests: [{ method: Get, url: '/bricks' }],
    checks: [
      { key: 'answers', test: async (ctx) => (await ctx.get('/bricks')).status === 200 },
      { key: 'all', test: async (ctx) => (await ctx.get('/bricks')).json?.length === 5 },
      { key: 'same', test: async (ctx) => same((await ctx.get('/bricks')).json, DATA) },
    ],
  },
  {
    id: 'filter-color',
    concept: 'query',
    example: `// GET /bricks?color=red&max=10
req.query.color // 'red'
req.query.max // '10', {{alwaysText}}`,
    js: `${START}${BRICKS}
app.get('/bricks', (req, res) => {
  const color = req.query.color
  // {{filterByColor}}
  res.json(bricks)
})
${LISTEN}`,
    solution: `${START}${BRICKS}
app.get('/bricks', (req, res) => {
  const color = req.query.color
  if (color) {
    return res.json(bricks.filter((b) => b.color === color))
  }
  res.json(bricks)
})
${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks?color=red' },
      { method: Get, url: '/bricks?color=blue' },
      { method: Get, url: '/bricks' },
    ],
    checks: [
      { key: 'red', test: async (ctx) => same(ids((await ctx.get('/bricks?color=red')).json), [1, 4]) },
      { key: 'blue', test: async (ctx) => same(ids((await ctx.get('/bricks?color=blue')).json), [2]) },
      { key: 'all', test: async (ctx) => (await ctx.get('/bricks')).json?.length === 5 },
      {
        key: 'unknown',
        test: async (ctx) => {
          const response = await ctx.get('/bricks?color=pink')
          return response.status === 200 && same(response.json, [])
        },
      },
    ],
  },
  {
    id: 'one-brick',
    concept: 'params',
    js: `${START}${BRICKS}
app.get('/bricks/:id', (req, res) => {
  // {{paramIsText}}
  const brick = bricks.find((b) => b.id === req.params.id)
  res.json(brick)
})
${LISTEN}`,
    solution: `${START}${BRICKS}
app.get('/bricks/:id', (req, res) => {
  const id = Number(req.params.id)
  const brick = bricks.find((b) => b.id === id)
  res.json(brick)
})
${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks/2' },
      { method: Get, url: '/bricks/4' },
    ],
    checks: [
      { key: 'second', test: async (ctx) => same((await ctx.get('/bricks/2')).json, brick(2)) },
      { key: 'fourth', test: async (ctx) => same((await ctx.get('/bricks/4')).json, brick(4)) },
      { key: 'isJson', test: async (ctx) => isJson(await ctx.get('/bricks/1')) && (await ctx.get('/bricks/1')).json?.id === 1 },
    ],
  },
  {
    id: 'not-found',
    concept: 'status',
    example: `res.status(201).json({ id: 6 })
res.status(404).send('Nothing here')`,
    js: `${START}${BRICKS}
app.get('/bricks/:id', (req, res) => {
  const brick = bricks.find((b) => b.id === Number(req.params.id))
  // {{answer404}}
  res.json(brick)
})
${LISTEN}`,
    solution: `${START}${BRICKS}${GET_ONE}${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks/99' },
      { method: Get, url: '/bricks/1' },
    ],
    checks: [
      { key: 'missing', test: async (ctx) => (await ctx.get('/bricks/99')).status === 404 },
      { key: 'message', test: async (ctx) => (await ctx.get('/bricks/99')).json?.error === 'Brick not found' },
      {
        key: 'once',
        test: async (ctx) => {
          const response = await ctx.get('/bricks/99')
          return response.status === 404 && ctx.errors.length === 0
        },
      },
      { key: 'found', test: async (ctx) => same((await ctx.get('/bricks/1')).json, brick(1)) },
    ],
  },
  {
    id: 'create-brick',
    concept: 'post',
    js: `${START}${BRICKS}${NEXT_ID}${GET_LIST}
app.post('/bricks', (req, res) => {
  // {{readBody}}
  // {{answer201}}
})
${LISTEN}`,
    solution: `${START_JSON}${BRICKS}${NEXT_ID}${GET_LIST}${POST_BRICK}${LISTEN}`,
    requests: [
      { method: Post, url: '/bricks', body: pretty(NEW_BRICK) },
      { method: Get, url: '/bricks' },
    ],
    checks: [
      { key: 'created', test: async (ctx) => (await ctx.post('/bricks', NEW_BRICK)).status === 201 },
      { key: 'returned', test: async (ctx) => same((await ctx.post('/bricks', NEW_BRICK)).json, { id: 6, ...NEW_BRICK }) },
      {
        key: 'listed',
        test: async (ctx) => {
          await ctx.post('/bricks', NEW_BRICK)
          const list = (await ctx.get('/bricks')).json
          return list?.length === 6 && list[5]?.name === NEW_BRICK.name
        },
      },
      {
        key: 'newIds',
        test: async (ctx) => {
          const first = await ctx.post('/bricks', NEW_BRICK)
          const second = await ctx.post('/bricks', { ...NEW_BRICK, name: 'Tile 1x1' })
          return first.json?.id === 6 && second.json?.id === 7
        },
      },
    ],
  },
  {
    id: 'validate',
    concept: 'validation',
    example: `if (!req.body.color) {
  return res.status(400).json({ error: 'color is required' })
}`,
    js: `${START_JSON}${BRICKS}${NEXT_ID}${GET_LIST}
app.post('/bricks', (req, res) => {
  // {{validateFirst}}
  const brick = {
    id: nextId++,
    name: req.body.name,
    color: req.body.color,
    price: req.body.price,
    stock: req.body.stock,
  }
  bricks.push(brick)
  res.status(201).json(brick)
})
${LISTEN}`,
    solution: `${START_JSON}${BRICKS}${NEXT_ID}${GET_LIST}
app.post('/bricks', (req, res) => {
  const { name, color, price, stock } = req.body
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'name and price are required' })
  }
  const brick = { id: nextId++, name, color, price, stock }
  bricks.push(brick)
  res.status(201).json(brick)
})
${LISTEN}`,
    requests: [
      { method: Post, url: '/bricks', body: pretty({ color: 'red', price: 1 }) },
      { method: Post, url: '/bricks', body: pretty({ ...NEW_BRICK, price: 'cheap' }) },
      { method: Post, url: '/bricks', body: pretty(NEW_BRICK) },
    ],
    checks: [
      { key: 'noName', test: async (ctx) => (await ctx.post('/bricks', { color: 'red', price: 1 })).status === 400 },
      { key: 'badPrice', test: async (ctx) => (await ctx.post('/bricks', { ...NEW_BRICK, price: 'cheap' })).status === 400 },
      {
        key: 'explains',
        test: async (ctx) => {
          const error = (await ctx.post('/bricks', { color: 'red', price: 1 })).json?.error
          return typeof error === 'string' && error.length > 0
        },
      },
      {
        key: 'notAdded',
        test: async (ctx) => {
          await ctx.post('/bricks', { color: 'red', price: 1 })
          await ctx.post('/bricks', { ...NEW_BRICK, price: 'cheap' })
          return (await ctx.get('/bricks')).json?.length === 5
        },
      },
      { key: 'stillCreates', test: async (ctx) => (await ctx.post('/bricks', NEW_BRICK)).status === 201 },
    ],
  },
  {
    id: 'replace-brick',
    concept: 'put',
    js: `${START_JSON}${BRICKS}${GET_ONE}
app.put('/bricks/:id', (req, res) => {
  const index = bricks.findIndex((b) => b.id === Number(req.params.id))
  // {{replaceAtIndex}}
})
${LISTEN}`,
    solution: `${START_JSON}${BRICKS}${GET_ONE}
app.put('/bricks/:id', (req, res) => {
  const index = bricks.findIndex((b) => b.id === Number(req.params.id))
  if (index === -1) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  const brick = { ...req.body, id: bricks[index].id }
  bricks[index] = brick
  res.json(brick)
})
${LISTEN}`,
    requests: [
      { method: Put, url: '/bricks/1', body: pretty({ name: 'Classic 2x4 XL', color: 'red', price: 0.5, stock: 10 }) },
      { method: Get, url: '/bricks/1' },
      { method: Put, url: '/bricks/99', body: pretty(NEW_BRICK) },
    ],
    checks: [
      {
        key: 'replaced',
        test: async (ctx) => {
          const sent = { name: 'Classic 2x4 XL', color: 'red', price: 0.5, stock: 10 }
          const response = await ctx.put('/bricks/1', sent)
          return response.status === 200 && same(response.json, { id: 1, ...sent })
        },
      },
      {
        key: 'kept',
        test: async (ctx) => {
          const sent = { name: 'Slope 2x3 XL', color: 'blue', price: 0.6, stock: 3 }
          await ctx.put('/bricks/4', sent)
          return same((await ctx.get('/bricks/4')).json, { id: 4, ...sent })
        },
      },
      { key: 'missing', test: async (ctx) => (await ctx.put('/bricks/99', NEW_BRICK)).status === 404 },
      {
        key: 'sameId',
        test: async (ctx) => {
          const response = await ctx.put('/bricks/2', { ...NEW_BRICK, id: 50 })
          return response.json?.id === 2 && (await ctx.get('/bricks/50')).status === 404
        },
      },
    ],
  },
  {
    id: 'patch-brick',
    concept: 'patch',
    example: `const merged = { ...{ a: 1, b: 2 }, ...{ b: 3 } }
// { a: 1, b: 3 }`,
    js: `${START_JSON}${BRICKS}${GET_ONE}
app.patch('/bricks/:id', (req, res) => {
  const brick = bricks.find((b) => b.id === Number(req.params.id))
  if (!brick) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  // {{patchOnlySent}}
  const updated = {
    id: brick.id,
    name: req.body.name,
    color: req.body.color,
    price: req.body.price,
    stock: req.body.stock,
  }
  bricks[bricks.indexOf(brick)] = updated
  res.json(updated)
})
${LISTEN}`,
    solution: `${START_JSON}${BRICKS}${GET_ONE}
app.patch('/bricks/:id', (req, res) => {
  const brick = bricks.find((b) => b.id === Number(req.params.id))
  if (!brick) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  const updated = { ...brick, ...req.body, id: brick.id }
  bricks[bricks.indexOf(brick)] = updated
  res.json(updated)
})
${LISTEN}`,
    requests: [
      { method: Patch, url: '/bricks/1', body: pretty({ stock: 0 }) },
      { method: Get, url: '/bricks/1' },
    ],
    checks: [
      { key: 'onlyStock', test: async (ctx) => same((await ctx.patch('/bricks/1', { stock: 0 })).json, { ...brick(1), stock: 0 }) },
      {
        key: 'kept',
        test: async (ctx) => {
          await ctx.patch('/bricks/2', { stock: 7 })
          return same((await ctx.get('/bricks/2')).json, { ...brick(2), stock: 7 })
        },
      },
      {
        key: 'twoFields',
        test: async (ctx) => same((await ctx.patch('/bricks/4', { price: 0.35, stock: 5 })).json, { ...brick(4), price: 0.35, stock: 5 }),
      },
      { key: 'sameId', test: async (ctx) => (await ctx.patch('/bricks/3', { id: 50, stock: 1 })).json?.id === 3 },
    ],
  },
  {
    id: 'delete-brick',
    concept: 'delete',
    js: `${START}${BRICKS}${GET_LIST}${GET_ONE}
app.delete('/bricks/:id', (req, res) => {
  // {{removeBrick}}
})
${LISTEN}`,
    solution: `${START}${BRICKS}${GET_LIST}${GET_ONE}
app.delete('/bricks/:id', (req, res) => {
  const index = bricks.findIndex((b) => b.id === Number(req.params.id))
  if (index === -1) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  bricks.splice(index, 1)
  res.status(204).send()
})
${LISTEN}`,
    requests: [
      { method: Delete, url: '/bricks/3' },
      { method: Get, url: '/bricks/3' },
      { method: Get, url: '/bricks' },
    ],
    checks: [
      {
        key: 'noContent',
        test: async (ctx) => {
          const response = await ctx.delete('/bricks/3')
          return response.status === 204 && response.body === ''
        },
      },
      {
        key: 'gone',
        test: async (ctx) => {
          await ctx.delete('/bricks/3')
          return (await ctx.get('/bricks/3')).status === 404
        },
      },
      {
        key: 'others',
        test: async (ctx) => {
          await ctx.delete('/bricks/3')
          return same(ids((await ctx.get('/bricks')).json), [1, 2, 4, 5])
        },
      },
      { key: 'missing', test: async (ctx) => (await ctx.delete('/bricks/99')).status === 404 },
    ],
  },
  {
    id: 'brick-orders',
    concept: 'rest',
    js: `${START}${BRICKS}${ORDERS}
// {{restUrls}}
app.get('/getOrdersOfBrick', (req, res) => {
  const brickId = Number(req.query.brickId)
  res.json(orders.filter((o) => o.brickId === brickId))
})
${LISTEN}`,
    solution: `${START}${BRICKS}${ORDERS}
app.get('/bricks/:id/orders', (req, res) => {
  const id = Number(req.params.id)
  if (!bricks.some((b) => b.id === id)) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  res.json(orders.filter((o) => o.brickId === id))
})
${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks/1/orders' },
      { method: Get, url: '/bricks/3/orders' },
      { method: Get, url: '/getOrdersOfBrick?brickId=1' },
    ],
    checks: [
      { key: 'nested', test: async (ctx) => same(ids((await ctx.get('/bricks/1/orders')).json), [1, 4]) },
      {
        key: 'empty',
        test: async (ctx) => {
          const response = await ctx.get('/bricks/3/orders')
          return response.status === 200 && same(response.json, [])
        },
      },
      { key: 'missing', test: async (ctx) => (await ctx.get('/bricks/99/orders')).status === 404 },
      { key: 'noVerb', test: async (ctx) => (await ctx.get('/getOrdersOfBrick?brickId=1')).status === 404 },
    ],
  },
  {
    id: 'logger',
    concept: 'middleware',
    js: `${START}${BRICKS}
app.use((req, res) => {
  console.log(req.method, req.path)
  // {{callNext}}
})
${GET_LIST}${GET_ONE}${LISTEN}`,
    solution: `${START}${BRICKS}
app.use((req, res, next) => {
  console.log(req.method, req.path)
  next()
})
${GET_LIST}${GET_ONE}${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks' },
      { method: Get, url: '/bricks/2' },
      { method: Get, url: '/nothing-here' },
    ],
    checks: [
      { key: 'answers', test: async (ctx) => (await ctx.get('/bricks')).status === 200 },
      {
        key: 'logs',
        test: async (ctx) => {
          await ctx.get('/bricks')
          return ctx.logs.some((entry) => entry.text === 'GET /bricks')
        },
      },
      {
        key: 'every',
        test: async (ctx) => {
          const first = await ctx.get('/bricks/2')
          const second = await ctx.get('/nothing-here')
          const texts = ctx.logs.map((entry) => entry.text)
          return first.status === 200 && second.status === 404 && texts.includes('GET /bricks/2') && texts.includes('GET /nothing-here')
        },
      },
    ],
  },
  {
    id: 'api-key',
    concept: 'auth',
    example: `req.get('Content-Type') // 'application/json'
req.get('x-api-key') // {{headerAnyCase}}`,
    js: `${START}${BRICKS}
function requireKey(req, res, next) {
  // {{checkKey}}
  next()
}
${GET_LIST}${DELETE_BRICK}${LISTEN}`,
    solution: `${START}${BRICKS}
function requireKey(req, res, next) {
  const key = req.get('x-api-key')
  if (!key) {
    return res.status(401).json({ error: 'API key missing' })
  }
  if (key !== '${API_KEY}') {
    return res.status(403).json({ error: 'Wrong API key' })
  }
  next()
}
${GET_LIST}${DELETE_BRICK}${LISTEN}`,
    requests: [
      { method: Delete, url: '/bricks/1' },
      { method: Delete, url: '/bricks/1', headers: 'X-API-Key: nope' },
      { method: Delete, url: '/bricks/1', headers: `X-API-Key: ${API_KEY}` },
      { method: Get, url: '/bricks' },
    ],
    checks: [
      { key: 'noKey', test: async (ctx) => (await ctx.delete('/bricks/1')).status === 401 },
      { key: 'wrongKey', test: async (ctx) => (await ctx.delete('/bricks/1', keyHeader('nope'))).status === 403 },
      { key: 'rightKey', test: async (ctx) => (await ctx.delete('/bricks/1', keyHeader(API_KEY))).status === 204 },
      {
        key: 'kept',
        test: async (ctx) => {
          await ctx.delete('/bricks/1')
          await ctx.delete('/bricks/2', keyHeader('nope'))
          const response = await ctx.get('/bricks')
          return response.status === 200 && response.json?.length === 5
        },
      },
    ],
  },
  {
    id: 'error-handler',
    concept: 'errors',
    js: `${START}${BRICKS}
const rates = { EUR: { value: 1 }, USD: { value: 1.08 } }

app.get('/bricks/:id/price/:currency', (req, res) => {
  const brick = bricks.find((b) => b.id === Number(req.params.id))
  const rate = rates[req.params.currency]
  res.json({ price: Number((brick.price * rate.value).toFixed(2)), currency: req.params.currency })
})

// {{errorHandlerLast}}
${LISTEN}`,
    solution: `${START}${BRICKS}
const rates = { EUR: { value: 1 }, USD: { value: 1.08 } }

app.get('/bricks/:id/price/:currency', (req, res) => {
  const brick = bricks.find((b) => b.id === Number(req.params.id))
  const rate = rates[req.params.currency]
  res.json({ price: Number((brick.price * rate.value).toFixed(2)), currency: req.params.currency })
})

app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(500).json({ error: 'Something went wrong' })
})
${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks/1/price/USD' },
      { method: Get, url: '/bricks/1/price/GBP' },
      { method: Get, url: '/bricks/99/price/EUR' },
    ],
    checks: [
      { key: 'works', test: async (ctx) => (await ctx.get('/bricks/1/price/USD')).json?.price === 0.27 },
      {
        key: 'json',
        test: async (ctx) => {
          const response = await ctx.get('/bricks/1/price/GBP')
          return response.status === 500 && response.json?.error === 'Something went wrong'
        },
      },
      {
        key: 'noLeak',
        test: async (ctx) => {
          const response = await ctx.get('/bricks/99/price/EUR')
          return response.status === 500 && !/TypeError|undefined|price/.test(response.body)
        },
      },
      {
        key: 'logged',
        test: async (ctx) => {
          await ctx.get('/bricks/1/price/GBP')
          return ctx.logs.some((entry) => entry.level === 'error')
        },
      },
    ],
  },
  {
    id: 'sql-list',
    concept: 'database',
    database: true,
    example: `app.get('/orders', async (req, res) => {
  const orders = await db.all('SELECT * FROM orders')
  res.json(orders)
})`,
    js: `${START_DB}${BRICKS}
app.get('/bricks', (req, res) => {
  // {{readFromDb}}
  res.json(bricks)
})
${LISTEN}`,
    solution: `${START_DB}
app.get('/bricks', async (req, res) => {
  const bricks = await db.all('SELECT * FROM bricks')
  res.json(bricks)
})
${LISTEN}`,
    requests: [{ method: Get, url: '/bricks' }],
    checks: [
      { key: 'answers', test: async (ctx) => (await ctx.get('/bricks')).status === 200 },
      { key: 'ten', test: async (ctx) => (await ctx.get('/bricks')).json?.length === 10 },
      {
        key: 'rows',
        test: async (ctx) => {
          const list = (await ctx.get('/bricks')).json
          return same(list, ctx.query('SELECT * FROM bricks'))
        },
      },
    ],
  },
  {
    id: 'sql-injection',
    concept: 'placeholders',
    database: true,
    js: `${START_DB}
app.get('/bricks', async (req, res) => {
  const color = req.query.color
  if (!color) {
    return res.json(await db.all('SELECT * FROM bricks'))
  }
  // {{neverGlue}}
  const bricks = await db.all("SELECT * FROM bricks WHERE color = '" + color + "'")
  res.json(bricks)
})
${LISTEN}`,
    solution: `${START_DB}
app.get('/bricks', async (req, res) => {
  const color = req.query.color
  if (!color) {
    return res.json(await db.all('SELECT * FROM bricks'))
  }
  const bricks = await db.all('SELECT * FROM bricks WHERE color = ?', [color])
  res.json(bricks)
})
${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks?color=red' },
      { method: Get, url: "/bricks?color=it's" },
      { method: Get, url: `/bricks?color=${encodeURIComponent("x' OR '1'='1")}` },
    ],
    checks: [
      { key: 'filters', test: async (ctx) => same(ids((await ctx.get('/bricks?color=red')).json), [1, 4]) },
      {
        key: 'quote',
        test: async (ctx) => {
          const response = await ctx.get(`/bricks?color=${encodeURIComponent("it's")}`)
          return response.status === 200 && same(response.json, [])
        },
      },
      {
        key: 'injection',
        test: async (ctx) => {
          const response = await ctx.get(`/bricks?color=${encodeURIComponent("x' OR '1'='1")}`)
          return response.status === 200 && same(response.json, [])
        },
      },
      { key: 'placeholder', test: (ctx) => /color\s*=\s*\?/i.test(ctx.code) },
    ],
  },
  {
    id: 'sql-insert',
    concept: 'insert',
    database: true,
    js: `${START_DB}${DB_GET_ONE}
app.post('/bricks', async (req, res) => {
  const { name, color, price, stock } = req.body
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'name and price are required' })
  }
  // {{insertRow}}
})
${LISTEN}`,
    solution: `${START_DB}${DB_GET_ONE}
app.post('/bricks', async (req, res) => {
  const { name, color, price, stock } = req.body
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'name and price are required' })
  }
  const result = await db.run(
    'INSERT INTO bricks (name, color, price, stock) VALUES (?, ?, ?, ?)',
    [name, color, price, stock],
  )
  const brick = await db.get('SELECT * FROM bricks WHERE id = ?', [result.lastInsertRowid])
  res.status(201).json(brick)
})
${LISTEN}`,
    requests: [
      { method: Post, url: '/bricks', body: pretty(DB_BRICK) },
      { method: Get, url: '/bricks/11' },
    ],
    checks: [
      { key: 'created', test: async (ctx) => (await ctx.post('/bricks', DB_BRICK)).status === 201 },
      { key: 'newId', test: async (ctx) => (await ctx.post('/bricks', DB_BRICK)).json?.id === 11 },
      {
        key: 'stored',
        test: async (ctx) => {
          await ctx.post('/bricks', DB_BRICK)
          return ctx.query('SELECT name, color, price, stock FROM bricks WHERE id = 11').some((row) => same(row, DB_BRICK))
        },
      },
      {
        key: 'readable',
        test: async (ctx) => {
          await ctx.post('/bricks', DB_BRICK)
          return (await ctx.get('/bricks/11')).json?.name === DB_BRICK.name
        },
      },
    ],
  },
  {
    id: 'sql-changes',
    concept: 'changes',
    database: true,
    js: `${START_DB}
app.patch('/bricks/:id', async (req, res) => {
  // {{forgotWhere}}
  const result = await db.run('UPDATE bricks SET stock = ?', [req.body.stock])
  // {{noRowNotFound}}
  res.json(await db.get('SELECT * FROM bricks WHERE id = ?', [req.params.id]))
})

app.delete('/bricks/:id', async (req, res) => {
  const result = await db.run('DELETE FROM bricks WHERE id = ?', [req.params.id])
  // {{noRowNotFound}}
  res.status(204).send()
})
${LISTEN}`,
    solution: `${START_DB}
app.patch('/bricks/:id', async (req, res) => {
  const result = await db.run('UPDATE bricks SET stock = ? WHERE id = ?', [req.body.stock, req.params.id])
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  res.json(await db.get('SELECT * FROM bricks WHERE id = ?', [req.params.id]))
})

app.delete('/bricks/:id', async (req, res) => {
  const result = await db.run('DELETE FROM bricks WHERE id = ?', [req.params.id])
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Brick not found' })
  }
  res.status(204).send()
})
${LISTEN}`,
    requests: [
      { method: Patch, url: '/bricks/3', body: pretty({ stock: 40 }) },
      { method: Patch, url: '/bricks/99', body: pretty({ stock: 40 }) },
      { method: Delete, url: '/bricks/2' },
      { method: Delete, url: '/bricks/99' },
    ],
    checks: [
      {
        key: 'onlyOne',
        test: async (ctx) => {
          const response = await ctx.patch('/bricks/3', { stock: 40 })
          return response.json?.stock === 40 && ctx.query('SELECT id FROM bricks WHERE stock = 40').length === 1
        },
      },
      { key: 'patchMissing', test: async (ctx) => (await ctx.patch('/bricks/99', { stock: 40 })).status === 404 },
      {
        key: 'deleted',
        test: async (ctx) => {
          const response = await ctx.delete('/bricks/2')
          return response.status === 204 && ctx.query('SELECT id FROM bricks').length === 9
        },
      },
      { key: 'deleteMissing', test: async (ctx) => (await ctx.delete('/bricks/99')).status === 404 },
    ],
  },
  {
    id: 'shop-fetch',
    concept: 'fetch',
    database: true,
    shop: true,
    js: `${START_DB}
// {{shopNeedsBricks}}
app.get('/bricks', async (req, res) => {
  res.json(await db.all('SELECT * FROM bricks'))
})

// {{shopNeedsOrders}}
app.post('/orders', async (req, res) => {
})
${LISTEN}`,
    solution: `${START_DB}
app.get('/bricks', async (req, res) => {
  if (req.query.inStock === 'true') {
    return res.json(await db.all('SELECT * FROM bricks WHERE stock > 0'))
  }
  res.json(await db.all('SELECT * FROM bricks'))
})

app.post('/orders', async (req, res) => {
  const { brickId, quantity, customer } = req.body
  if (!customer || !(quantity > 0)) {
    return res.status(400).json({ error: 'customer and quantity are required' })
  }
  const result = await db.run(
    "INSERT INTO orders (customer, brick_id, quantity, ordered_on) VALUES (?, ?, ?, date('now'))",
    [customer, brickId, quantity],
  )
  res.status(201).json(await db.get('SELECT * FROM orders WHERE id = ?', [result.lastInsertRowid]))
})
${LISTEN}`,
    requests: [
      { method: Get, url: '/bricks?inStock=true' },
      { method: Post, url: '/orders', body: pretty({ brickId: 2, quantity: 1, customer: 'Ana' }) },
      { method: Post, url: '/orders', body: pretty({ brickId: 2, quantity: 0, customer: 'Ana' }) },
    ],
    checks: [
      {
        key: 'inStock',
        test: async (ctx) => {
          const list = (await ctx.get('/bricks?inStock=true')).json
          return list?.length === 8 && list.every((b) => b.stock > 0)
        },
      },
      { key: 'everyBrick', test: async (ctx) => (await ctx.get('/bricks')).json?.length === 10 },
      {
        key: 'ordered',
        test: async (ctx) => {
          const response = await ctx.post('/orders', { brickId: 2, quantity: 1, customer: 'Ana' })
          return response.status === 201 && response.json?.id === 9 && response.json?.status === 'pending'
        },
      },
      {
        key: 'stored',
        test: async (ctx) => {
          await ctx.post('/orders', { brickId: 2, quantity: 3, customer: 'Ben' })
          return ctx.query("SELECT id FROM orders WHERE id = 9 AND brick_id = 2 AND quantity = 3 AND customer = 'Ben'").length === 1
        },
      },
      { key: 'badQuantity', test: async (ctx) => (await ctx.post('/orders', { brickId: 2, quantity: 0, customer: 'Ana' })).status === 400 },
    ],
  },
]
