import { HOST } from './host.js'

const ORIGIN = `http://${HOST}`

function parseQuery(searchParams) {
  const query = {}
  for (const [key, value] of searchParams) {
    if (!(key in query)) query[key] = value
    else query[key] = [].concat(query[key], value)
  }
  return query
}

/** Header names in lower case, like Node gives them. */
export function normalizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.trim().toLowerCase(), String(value).trim()]))
}

/**
 * The `req` object of a handler: method, path, query, headers and the raw body, which `express.json()` turns into
 * `req.body`.
 * @param {import('../types/entities.js').RequestSpec} spec
 */
export function createRequest({ method, url, headers, body = '' }) {
  const parsed = new URL(url.startsWith('/') ? url : `/${url}`, ORIGIN)
  const lowered = normalizeHeaders(headers)
  return {
    method: method.toUpperCase(),
    url: parsed.pathname + parsed.search,
    originalUrl: parsed.pathname + parsed.search,
    path: parsed.pathname,
    baseUrl: '',
    query: parseQuery(parsed.searchParams),
    params: {},
    headers: lowered,
    body: undefined,
    rawBody: body,
    get: (name) => lowered[String(name).toLowerCase()],
    header: (name) => lowered[String(name).toLowerCase()],
  }
}
