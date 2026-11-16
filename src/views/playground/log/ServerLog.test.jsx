import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LogKind } from '../../../types/logKind.js'
import { LogLevel } from '../../../types/logLevel.js'
import { Notice } from '../../../types/notice.js'
import { Outcome } from '../../../types/outcome.js'
import { RunError } from '../../../types/runError.js'
import { ServerLog } from './ServerLog.jsx'

describe('ServerLog', () => {
  describe('empty', () => {
    it('says what will show up', () => {
      render(<ServerLog entries={[]} />)

      expect(screen.getByText('console.log')).toBeInTheDocument()
    })
  })

  describe('lines', () => {
    it('shows notices, console output, errors and requests with their status', () => {
      const entries = [
        { id: 1, kind: LogKind.Notice, notice: Notice.Restarted },
        { id: 2, kind: LogKind.Console, level: LogLevel.Log, text: 'GET /bricks' },
        { id: 3, kind: LogKind.Error, error: { type: RunError.Runtime, name: 'TypeError', message: 'boom', line: 7 } },
        { id: 4, kind: LogKind.Request, response: { outcome: Outcome.Answered, method: 'GET', path: '/bricks/9', status: 404, ms: 2 } },
      ]
      render(<ServerLog entries={entries} />)

      const lines = screen.getAllByRole('listitem')
      expect(lines[0]).toHaveTextContent('Server restarted with your code')
      expect(lines[1]).toHaveTextContent('GET /bricks')
      expect(lines[2]).toHaveTextContent('TypeError: boom (line 7)')
      expect(lines[2]).toHaveClass('is-error')
      expect(lines[3]).toHaveTextContent('GET /bricks/9 → 404 Not Found · 2 ms')
    })

    it('marks a request that got no response', () => {
      const entries = [{ id: 1, kind: LogKind.Request, response: { outcome: Outcome.NoResponse, method: 'GET', path: '/bricks', ms: 50 } }]
      render(<ServerLog entries={entries} />)

      expect(screen.getByRole('listitem')).toHaveTextContent('GET /bricks → no response')
    })
  })
})
