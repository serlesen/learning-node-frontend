import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithUser } from '../../../test/render.js'
import { Outcome } from '../../../types/outcome.js'
import { ShopPreview } from './ShopPreview.jsx'

const answer = (status, value) => ({ outcome: Outcome.Answered, status, headers: {}, body: JSON.stringify(value), ms: 1 })

describe('ShopPreview', () => {
  describe('bricks', () => {
    it('asks for the bricks in stock and lists them', async () => {
      const onSend = vi.fn().mockResolvedValue(answer(200, [{ id: 2, name: 'Classic 2x2', price: 0.15 }]))
      renderWithUser(<ShopPreview onSend={onSend} />)

      expect(await screen.findByText('Classic 2x2')).toBeInTheDocument()
      expect(onSend).toHaveBeenCalledWith({ method: 'GET', url: '/bricks?inStock=true', headers: {}, body: '' })
    })

    it('says the bricks could not be loaded when the answer is not a list', async () => {
      const onSend = vi.fn().mockResolvedValue(answer(404, { error: 'nope' }))
      renderWithUser(<ShopPreview onSend={onSend} />)

      expect(await screen.findByText('The bricks could not be loaded')).toBeInTheDocument()
    })
  })

  describe('order', () => {
    it('sends the order and shows what the API answered', async () => {
      const onSend = vi
        .fn()
        .mockResolvedValueOnce(answer(200, [{ id: 2, name: 'Classic 2x2', price: 0.15 }]))
        .mockResolvedValueOnce(answer(201, { id: 9, status: 'pending' }))
      const { user } = renderWithUser(<ShopPreview onSend={onSend} />)

      await user.click(await screen.findByRole('button', { name: 'Order 1' }))

      expect(await screen.findByText('Order #9 is pending')).toBeInTheDocument()
      expect(JSON.parse(onSend.mock.calls[1][0].body)).toEqual({ brickId: 2, quantity: 1, customer: 'Ana' })
    })
  })
})
