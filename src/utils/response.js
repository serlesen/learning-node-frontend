import { statusText } from './statusText.js'

const HTML = 'text/html; charset=utf-8'
const JSON_TYPE = 'application/json; charset=utf-8'
const TEXT = 'text/plain; charset=utf-8'
const EMPTY_STATUSES = [204, 304]

function headersSent() {
  const error = new Error('Cannot set headers after they are sent to the client')
  error.code = 'ERR_HTTP_HEADERS_SENT'
  return error
}

const byteLength = (text) => new TextEncoder().encode(text).length

/**
 * The `res` object of a handler, with the Express methods the lessons use. `onFinish` is called once, when the
 * response is sent; sending a second one throws, like Node does.
 * @param {(res: object) => void} onFinish
 */
export function createResponse(onFinish) {
  const headers = { 'x-powered-by': 'Express' }

  const res = {
    statusCode: 200,
    headersSent: false,
    finished: false,
    body: '',
    locals: {},
    headers,
    status(code) {
      res.statusCode = Number(code)
      return res
    },
    set(name, value) {
      if (res.headersSent) throw headersSent()
      if (typeof name === 'object') Object.entries(name).forEach(([key, v]) => res.set(key, v))
      else headers[String(name).toLowerCase()] = String(value)
      return res
    },
    header(name, value) {
      return res.set(name, value)
    },
    get(name) {
      return headers[String(name).toLowerCase()]
    },
    type(type) {
      return res.set('content-type', type.includes('/') ? type : type === 'json' ? JSON_TYPE : type === 'html' ? HTML : TEXT)
    },
    location(url) {
      return res.set('location', url)
    },
    end(body = '') {
      if (res.headersSent) throw headersSent()
      const empty = EMPTY_STATUSES.includes(res.statusCode)
      res.body = empty ? '' : String(body ?? '')
      if (empty) delete headers['content-type']
      else headers['content-length'] = String(byteLength(res.body))
      res.headersSent = true
      res.finished = true
      onFinish(res)
      return res
    },
    send(body) {
      if (res.headersSent) throw headersSent()
      if (body === undefined || body === null) return res.end('')
      if (typeof body === 'object' || typeof body === 'number' || typeof body === 'boolean') return res.json(body)
      if (!headers['content-type']) headers['content-type'] = HTML
      return res.end(String(body))
    },
    json(value) {
      if (res.headersSent) throw headersSent()
      if (!headers['content-type']) headers['content-type'] = JSON_TYPE
      return res.end(value === undefined ? '' : JSON.stringify(value))
    },
    sendStatus(code) {
      res.status(code)
      if (!headers['content-type']) headers['content-type'] = TEXT
      return res.end(statusText(code) || String(code))
    },
    redirect(url) {
      return res.status(302).location(url).end()
    },
  }

  return res
}
