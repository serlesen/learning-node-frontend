import { describe, expect, it } from 'vitest'
import { parseHeaderLines, parseJson, prettyBody } from './body.js'

describe('body', () => {
  describe('parseJson', () => {
    it('parses JSON and gives undefined for anything else', () => {
      expect(parseJson('{"a":1}')).toEqual({ a: 1 })
      expect(parseJson('Cannot GET /')).toBeUndefined()
      expect(parseJson('')).toBeUndefined()
    })
  })

  describe('prettyBody', () => {
    it('indents a JSON body and leaves other bodies as they are', () => {
      expect(prettyBody('{"a":1}', 'application/json')).toBe('{\n  "a": 1\n}')
      expect(prettyBody('{"a":1}', 'text/html')).toBe('{"a":1}')
    })
  })

  describe('parseHeaderLines', () => {
    it('reads one header per line and skips lines without a name', () => {
      expect(parseHeaderLines('X-API-Key: brick-secret\n\nnope\nAccept: a:b')).toEqual({
        'X-API-Key': 'brick-secret',
        Accept: 'a:b',
      })
    })
  })
})
