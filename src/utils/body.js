/** The body parsed as JSON, or `undefined` when it isn't JSON. */
export function parseJson(body) {
  if (!body) return undefined
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

/** The body as the client shows it: JSON indented, anything else as it came. */
export function prettyBody(body, contentType = '') {
  if (!contentType.includes('json')) return body
  const value = parseJson(body)
  return value === undefined ? body : JSON.stringify(value, null, 2)
}

/** `Name: value` lines into a headers object; lines without a colon are ignored. */
export function parseHeaderLines(text) {
  const headers = {}
  for (const line of text.split('\n')) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return headers
}
