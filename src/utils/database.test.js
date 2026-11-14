import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadTestEngine } from '../test/engine.js'
import { SHOP_SEED, SHOP_TABLES } from '../views/playground/shopDatabase.js'
import { openDatabase } from './database.js'

let SQL
let db

beforeAll(async () => {
  SQL = await loadTestEngine()
})

beforeEach(() => {
  db = openDatabase(SQL, SHOP_SEED, SHOP_TABLES)
})

describe('database', () => {
  describe('api', () => {
    it('reads every row, or the first one, as objects', async () => {
      expect(await db.api.all('SELECT id FROM bricks WHERE color = ?', ['red'])).toEqual([{ id: 1 }, { id: 4 }])
      expect(await db.api.get('SELECT name FROM bricks WHERE id = ?', [2])).toEqual({ name: 'Classic 2x2' })
      expect(await db.api.get('SELECT name FROM bricks WHERE id = ?', [99])).toBeUndefined()
    })

    it('runs a change and tells how many rows changed and the last id', async () => {
      const inserted = await db.api.run('INSERT INTO bricks (name, color) VALUES (?, ?)', ['Tile', 'green'])
      const updated = await db.api.run('UPDATE bricks SET stock = 0 WHERE color = ?', 'red')

      expect(inserted).toEqual({ changes: 1, lastInsertRowid: 11 })
      expect(updated.changes).toBe(2)
    })

    it('binds a missing value as NULL', async () => {
      await db.api.run('INSERT INTO bricks (name, color, price) VALUES (?, ?, ?)', ['Tile', 'green', undefined])

      expect(db.query('SELECT price FROM bricks WHERE id = 11')).toEqual([{ price: null }])
    })

    it('rejects bad SQL', async () => {
      await expect(db.api.all('SELECT nope FROM bricks')).rejects.toThrow(/no such column/)
    })
  })

  describe('tables', () => {
    it('lists every table with its columns and rows', () => {
      const [bricks, orders] = db.tables()

      expect(bricks.name).toBe('bricks')
      expect(bricks.columns).toEqual(['id', 'name', 'color', 'studs', 'price', 'stock', 'added_on'])
      expect(bricks.rows).toHaveLength(10)
      expect(orders.rows).toHaveLength(8)
    })
  })

  describe('close', () => {
    it('can be closed twice and has no tables once closed', () => {
      db.close()

      expect(() => db.close()).not.toThrow()
      expect(db.tables()).toEqual([])
    })
  })
})
