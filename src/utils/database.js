const toParams = (params) =>
  (params === undefined ? [] : Array.isArray(params) ? params : [params]).map((value) =>
    value === undefined ? null : typeof value === 'boolean' ? Number(value) : value,
  )

/**
 * A fresh copy of the shop database, with the promise-based API the student's code gets from `require('./db')`:
 * `all` (every row), `get` (the first row) and `run` (a change, resolving with `changes` and `lastInsertRowid`).
 * Values go in `?` placeholders, in the order of the `params` array.
 * @param {any} SQL the sql.js module
 * @param {string} seed
 * @param {string[]} tables
 * @returns {import('../types/entities.js').ShopDatabase}
 */
export function openDatabase(SQL, seed, tables) {
  const db = new SQL.Database()
  db.exec(seed)
  let closed = false

  const rows = (sql, params) => {
    const statement = db.prepare(String(sql))
    try {
      statement.bind(toParams(params))
      const found = []
      while (statement.step()) found.push(statement.getAsObject())
      return found
    } finally {
      statement.free()
    }
  }

  const api = {
    all: async (sql, params) => rows(sql, params),
    get: async (sql, params) => rows(sql, params)[0],
    run: async (sql, params) => {
      rows(sql, params)
      const changes = db.getRowsModified()
      const lastInsertRowid = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
      return { changes, lastInsertRowid }
    },
  }

  return {
    api,
    query: (sql) => rows(sql),
    tables: () => {
      if (closed) return []
      return tables.map((name) => {
        const result = db.exec(`SELECT * FROM ${name} ORDER BY id`)[0]
        const columns = result?.columns ?? db.exec(`PRAGMA table_info(${name})`)[0].values.map(([, column]) => column)
        return { name, columns, rows: result?.values ?? [] }
      })
    },
    close: () => {
      if (closed) return
      closed = true
      db.close()
    },
  }
}
