import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadProgress, saveProgress } from './progressService.js'

const EMPTY = { current: 0, completed: [], code: {}, hints: {} }

describe('progressService', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('loadProgress', () => {
    it('starts empty when nothing is saved', () => {
      expect(loadProgress()).toEqual(EMPTY)
    })

    it('returns the saved progress, completed with the missing fields', () => {
      localStorage.setItem('brick-shop-api:v1', JSON.stringify({ current: 3, completed: ['hello'] }))

      expect(loadProgress()).toEqual({ ...EMPTY, current: 3, completed: ['hello'] })
    })

    it('starts empty when the saved value is broken', () => {
      localStorage.setItem('brick-shop-api:v1', '{nope')

      expect(loadProgress()).toEqual(EMPTY)
    })
  })

  describe('saveProgress', () => {
    it('saves what loadProgress reads back', () => {
      const progress = { current: 1, completed: [], code: { hello: "const shopName = 'x'" }, hints: { hello: 2 } }

      saveProgress(progress)

      expect(loadProgress()).toEqual(progress)
    })

    it('does not throw when the storage is blocked', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })

      expect(() => saveProgress(EMPTY)).not.toThrow()
    })
  })
})
