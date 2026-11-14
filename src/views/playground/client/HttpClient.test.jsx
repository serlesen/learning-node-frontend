import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithUser } from '../../../test/render.js'
import { HttpMethod } from '../../../types/httpMethod.js'
import { Outcome } from '../../../types/outcome.js'
import { HttpClient } from './HttpClient.jsx'

const requests = [
  { method: HttpMethod.Get, url: '/bricks' },
  { method: HttpMethod.Delete, url: '/bricks/1', headers: 'X-API-Key: brick-secret' },
]

const answer = (fields) => vi.fn().mockResolvedValue({ outcome: Outcome.Answered, method: 'GET', path: '/bricks', ms: 3, ...fields })

describe('HttpClient', () => {
  describe('request', () => {
    it('starts with the first ready-made request and sends what is written', async () => {
      const onSend = answer({ status: 200, headers: {}, body: '' })
      const { user } = renderWithUser(<HttpClient requests={requests} onSend={onSend} />)

      expect(screen.getByRole('textbox', { name: 'URL' })).toHaveValue('/bricks')
      await user.selectOptions(screen.getByRole('combobox', { name: 'Method' }), 'POST')
      await user.click(screen.getByRole('tab', { name: 'Body' }))
      await user.type(screen.getByRole('textbox', { name: 'Request body, in JSON' }), '{{"name": "Tile"}')
      await user.click(screen.getByRole('button', { name: 'Send' }))

      expect(onSend).toHaveBeenCalledWith({
        method: 'POST',
        url: '/bricks',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "Tile"}',
      })
    })

    it('fills and sends a ready-made request, with its headers', async () => {
      const onSend = answer({ status: 204, headers: {}, body: '' })
      const { user } = renderWithUser(<HttpClient requests={requests} onSend={onSend} />)

      await user.click(screen.getByRole('button', { name: 'Fill the client with DELETE /bricks/1' }))

      expect(onSend).toHaveBeenCalledWith({ method: 'DELETE', url: '/bricks/1', headers: { 'X-API-Key': 'brick-secret' }, body: '' })
      expect(screen.getByRole('textbox', { name: 'Request headers, one Name: value per line' })).toHaveValue('X-API-Key: brick-secret')
    })

    it('cannot send while the server is stopped', () => {
      renderWithUser(<HttpClient requests={requests} stopped onSend={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
      expect(screen.getByText(/The server is stopped/)).toBeInTheDocument()
    })
  })

  describe('response', () => {
    it('shows the status, the time and the JSON body indented', async () => {
      const onSend = answer({ status: 404, headers: { 'content-type': 'application/json; charset=utf-8' }, body: '{"error":"Brick not found"}' })
      const { user } = renderWithUser(<HttpClient requests={requests} onSend={onSend} />)

      await user.click(screen.getByRole('button', { name: 'Send' }))

      expect(screen.getByText('404 Not Found')).toBeInTheDocument()
      expect(screen.getByText('3 ms')).toBeInTheDocument()
      expect(screen.getByText(/"error": "Brick not found"/)).toBeInTheDocument()
    })

    it('shows the response headers', async () => {
      const onSend = answer({ status: 200, headers: { 'x-powered-by': 'Express' }, body: 'ok' })
      const { user } = renderWithUser(<HttpClient requests={requests} onSend={onSend} />)

      await user.click(screen.getByRole('button', { name: 'Send' }))
      await user.click(screen.getAllByRole('tab', { name: 'Headers' })[1])

      expect(screen.getByText('x-powered-by')).toBeInTheDocument()
      expect(screen.getByText('Express')).toBeInTheDocument()
    })

    it('explains a request that got no response', async () => {
      const onSend = vi.fn().mockResolvedValue({ outcome: Outcome.NoResponse, method: 'GET', path: '/bricks', ms: 50 })
      const { user } = renderWithUser(<HttpClient requests={requests} onSend={onSend} />)

      await user.click(screen.getByRole('button', { name: 'Send' }))

      expect(screen.getByText(/the request is still waiting/)).toBeInTheDocument()
    })
  })
})
