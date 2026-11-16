const TEXTS = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  418: "I'm a Teapot",
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  503: 'Service Unavailable',
}

/** The reason phrase HTTP gives to a status code, like Node's `http.STATUS_CODES`. */
export const statusText = (status) => TEXTS[status] ?? ''

/** 2, 4 or 5 for a 2xx, 4xx or 5xx status. */
export const statusClass = (status) => Math.floor(status / 100)
