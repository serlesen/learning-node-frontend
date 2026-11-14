import { beforeAll, describe, expect, it } from 'vitest'
import { locales } from '../../i18n/index.js'
import { loadTestEngine } from '../../test/engine.js'
import { CheckStatus } from '../../types/checkStatus.js'
import { runChecks } from '../../utils/checks.js'
import { fillComments } from '../../utils/codeComments.js'
import { openDatabase } from '../../utils/database.js'
import { levels } from './levels.js'
import { SHOP_SEED, SHOP_TABLES } from './shopDatabase.js'

const codeOf = (l) => [l.js, l.solution, l.example].filter(Boolean)
const failing = (results) => results.filter((r) => r.status !== CheckStatus.Pass)

let options

beforeAll(async () => {
  const SQL = await loadTestEngine()
  options = { openDb: () => openDatabase(SQL, SHOP_SEED, SHOP_TABLES) }
})

describe('levels', () => {
  describe('structure', () => {
    it('has 20 steps with unique ids', () => {
      expect(levels).toHaveLength(20)
      expect(new Set(levels.map((l) => l.id)).size).toBe(20)
    })

    it('has unique check keys and at least one ready-made request in every step', () => {
      for (const l of levels) {
        expect(new Set(l.checks.map((c) => c.key)).size, l.id).toBe(l.checks.length)
        expect(l.requests.length, l.id).toBeGreaterThan(0)
      }
    })
  })

  describe.each(levels.map((l) => [l.id, l]))('%s', (_, level) => {
    it('passes every check with the solution', async () => {
      expect(failing(await runChecks(level, level.solution, options))).toEqual([])
    })

    it('fails at least one check with the starter code, without crashing', async () => {
      const results = await runChecks(level, fillComments(level.js, locales.en.codeComments), options)

      expect(results.some((r) => r.status === CheckStatus.Fail), level.id).toBe(true)
      expect(results.filter((r) => r.status === CheckStatus.Error)).toEqual([])
    })
  })

  describe.each(Object.keys(locales))('texts in %s', (language) => {
    const translation = locales[language]

    it('has a title, an intro, a goal, hints, a recap and every check for every step', () => {
      for (const l of levels) {
        const texts = translation.levels[l.id]
        expect(texts?.title && texts.goal && texts.recap && texts.intro.length && texts.hints.length >= 2, l.id).toBeTruthy()
        expect(Object.keys(texts.checks).sort(), l.id).toEqual(l.checks.map((c) => c.key).sort())
      }
      expect(Object.keys(translation.levels)).toEqual(levels.map((l) => l.id))
    })

    it('has a name and a definition for the concept of every step', () => {
      for (const l of levels) {
        expect(translation.concepts[l.concept]?.definition, l.id).toBeTruthy()
      }
    })

    it('has the same number of intro paragraphs and hints as English', () => {
      for (const l of levels) {
        expect(translation.levels[l.id].intro.length, l.id).toBe(locales.en.levels[l.id].intro.length)
        expect(translation.levels[l.id].hints.length, l.id).toBe(locales.en.levels[l.id].hints.length)
      }
    })

    it('fills every comment placeholder of the code without breaking it', () => {
      for (const l of levels) {
        for (const code of codeOf(l)) {
          const filled = fillComments(code, translation.codeComments)
          expect(filled, l.id).not.toMatch(/\{\{\w+\}\}/)
          expect(() => new Function(`async () => {\n${filled}\n}`), l.id).not.toThrow()
        }
      }
    })

    it('runs the starter code without errors once its comments are translated', async () => {
      for (const l of levels) {
        const results = await runChecks(l, fillComments(l.js, translation.codeComments), options)
        expect(results.filter((r) => r.status === CheckStatus.Error), l.id).toEqual([])
      }
    })
  })
})
