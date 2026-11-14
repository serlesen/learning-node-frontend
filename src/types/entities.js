/**
 * @typedef {import('./editorTab.js').EditorTab[keyof import('./editorTab.js').EditorTab]} EditorTabValue
 * @typedef {import('./clientTab.js').ClientTab[keyof import('./clientTab.js').ClientTab]} ClientTabValue
 * @typedef {import('./runError.js').RunError[keyof import('./runError.js').RunError]} RunErrorValue
 * @typedef {import('./logLevel.js').LogLevel[keyof import('./logLevel.js').LogLevel]} LogLevelValue
 * @typedef {import('./logKind.js').LogKind[keyof import('./logKind.js').LogKind]} LogKindValue
 * @typedef {import('./checkStatus.js').CheckStatus[keyof import('./checkStatus.js').CheckStatus]} CheckStatusValue
 * @typedef {import('./notice.js').Notice[keyof import('./notice.js').Notice]} NoticeValue
 * @typedef {import('./outcome.js').Outcome[keyof import('./outcome.js').Outcome]} OutcomeValue
 * @typedef {import('./httpMethod.js').HttpMethod[keyof import('./httpMethod.js').HttpMethod]} HttpMethodValue
 * @typedef {import('./language.js').Language[keyof import('./language.js').Language]} LanguageValue
 */

/**
 * Its texts live in the translations, under `levels.<id>`, the label of each check under `levels.<id>.checks.<key>`.
 * The `{{key}}` placeholders in its code are comments, translated under `codeComments.<key>`.
 * @typedef {Object} Level
 * @property {string} id
 * @property {string} concept key under `concepts`
 * @property {string} js the starter `server.js`
 * @property {string} solution
 * @property {string} [example]
 * @property {boolean} [database] the code can `require('./db')`, and the tables are shown
 * @property {boolean} [shop] the shop page calls the API, and its `shop.js` is shown
 * @property {ClientRequest[]} requests ready-made requests offered in the client
 * @property {Check[]} checks
 */

/**
 * Runs on a freshly started server, with fresh data.
 * @typedef {Object} Check
 * @property {string} key
 * @property {(ctx: CheckContext) => boolean | Promise<boolean>} test
 */

/**
 * What a check sees. `code` is the student's code without its comments, `logs` what it printed with `console`,
 * `errors` the errors Express reported. `query` reads the database the server uses.
 * @typedef {Object} CheckContext
 * @property {string} code
 * @property {ServerLogEntry[]} logs
 * @property {RunErrorInfo[]} errors
 * @property {(method: string, url: string, options?: { body?: unknown, headers?: Record<string, string> }) => Promise<CheckResponse>} request
 * @property {(url: string, options?: object) => Promise<CheckResponse>} get
 * @property {(url: string, body?: unknown, options?: object) => Promise<CheckResponse>} post
 * @property {(url: string, body?: unknown, options?: object) => Promise<CheckResponse>} put
 * @property {(url: string, body?: unknown, options?: object) => Promise<CheckResponse>} patch
 * @property {(url: string, options?: object) => Promise<CheckResponse>} delete
 * @property {(sql: string) => Record<string, unknown>[]} query
 */

/**
 * @typedef {HttpResponse & { json: any }} CheckResponse
 */

/**
 * A request as the client writes it: the body is the raw text.
 * @typedef {Object} ClientRequest
 * @property {HttpMethodValue} method
 * @property {string} url
 * @property {string} [body]
 * @property {string} [headers] one `Name: value` per line
 */

/**
 * @typedef {Object} RequestSpec
 * @property {string} method
 * @property {string} url path and query, like `/bricks?color=red`
 * @property {Record<string, string>} [headers]
 * @property {string} [body]
 */

/**
 * What the client receives. Without an answer (`outcome` other than `answered`), only `method`, `path` and `ms`.
 * @typedef {Object} HttpResponse
 * @property {OutcomeValue} outcome
 * @property {string} method
 * @property {string} path
 * @property {number} ms
 * @property {number} [status]
 * @property {Record<string, string>} [headers]
 * @property {string} [body]
 */

/**
 * @typedef {Object} Server
 * @property {number} port
 * @property {(spec: RequestSpec) => Promise<{ response: HttpResponse, logs: ServerLogEntry[] }>} handle
 * @property {(options?: { open?: boolean }) => ShopDatabase | null} database the database, once the code queried it;
 * `open` opens it when the code required it but didn't query it yet
 */

/**
 * @typedef {Object} ServerStart
 * @property {RunErrorInfo | null} error
 * @property {ServerLogEntry[]} logs
 * @property {Server | null} server
 */

/**
 * @typedef {Object} ShopDatabase
 * @property {{ all: Function, get: Function, run: Function }} api what `require('./db')` returns
 * @property {(sql: string) => Record<string, unknown>[]} query
 * @property {() => ShopTable[]} tables
 * @property {() => void} close
 */

/**
 * @typedef {Object} ShopTable
 * @property {string} name
 * @property {string[]} columns
 * @property {unknown[][]} rows
 */

/**
 * @typedef {Object} RunErrorInfo
 * @property {RunErrorValue} type
 * @property {string} [name]
 * @property {string} [message]
 * @property {number} [line]
 */

/**
 * A line of the server log: a notice from the playground, a request and its answer, a `console` output or an error.
 * @typedef {Object} ServerLogEntry
 * @property {LogKindValue} kind
 * @property {number} [id]
 * @property {LogLevelValue} [level]
 * @property {string} [text]
 * @property {RunErrorInfo} [error]
 * @property {NoticeValue} [notice]
 * @property {HttpResponse} [response]
 */

/**
 * @typedef {Object} CheckResult
 * @property {string} key
 * @property {CheckStatusValue} status
 * @property {RunErrorInfo} [error] why the server stopped, or the first error it reported during a failed check
 */

/**
 * @typedef {Object} Progress
 * @property {number} current
 * @property {string[]} completed
 * @property {Record<string, string>} code
 * @property {Record<string, number>} hints
 */

export {}
