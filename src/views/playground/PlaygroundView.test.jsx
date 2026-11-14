import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgressStore } from '../../stores/progressStore.js'
import { loadTestEngine } from '../../test/engine.js'
import { renderWithUser } from '../../test/render.js'
import { levels } from './levels.js'
import { PlaygroundView } from './PlaygroundView.jsx'

vi.mock('../../services/sqlEngine.js', () => ({ loadEngine: () => loadTestEngine() }))

const goTo = (id, code = {}) =>
  useProgressStore.setState({ current: levels.findIndex((l) => l.id === id), completed: [], code, hints: {} })

const log = () => within(screen.getByRole('region', { name: 'Server log' }))
const WAIT = { timeout: 5000 }
const client = () => within(screen.getByRole('region', { name: 'HTTP client' }))

describe('PlaygroundView', () => {
  beforeEach(() => goTo('hello'))

  describe('an in-memory step', () => {
    it('starts the server and checks the starter code', async () => {
      renderWithUser(<PlaygroundView />)

      expect(log().getByText('Server restarted with your code')).toBeInTheDocument()
      expect(log().getByText('Brick Shop API on port 3000')).toBeInTheDocument()
      expect(await screen.findByText('1 of 3 checks passed', {}, WAIT)).toBeInTheDocument()
    })

    it('sends a request to the running server and logs it', async () => {
      const { user } = renderWithUser(<PlaygroundView />)

      await user.click(screen.getByRole('button', { name: 'Send' }))

      expect(await client().findByText('404 Not Found', {}, WAIT)).toBeInTheDocument()
      expect(client().getByText('Cannot GET /hello')).toBeInTheDocument()
      expect(log().getAllByRole('listitem').at(-1)).toHaveTextContent('GET /hello → 404 Not Found')
    })

    it('completes the step with the solution', async () => {
      const { user } = renderWithUser(<PlaygroundView />)

      for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /hint/i }))
      await user.click(screen.getByRole('button', { name: 'Show me the solution' }))
      await user.click(screen.getByRole('button', { name: 'Replace my code' }))

      expect(await screen.findByText('Step complete!', {}, WAIT)).toBeInTheDocument()
      expect(useProgressStore.getState().completed).toEqual(['hello'])
    })

    it('stops the server on a syntax error', async () => {
      goTo('hello', { hello: "const express = require('express')\nconst app = express(" })
      renderWithUser(<PlaygroundView />)

      expect(log().getByText(/Syntax error/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    })
  })

  describe('a database step', () => {
    it('shows the tables once the database is loaded, and their changes', async () => {
      const level = levels.find((l) => l.id === 'sql-insert')
      goTo('sql-insert', { 'sql-insert': level.solution })
      const { user } = renderWithUser(<PlaygroundView />)

      expect(await screen.findByText('10 rows', {}, WAIT)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Send' }))

      expect(await client().findByText('201 Created', {}, WAIT)).toBeInTheDocument()
      expect(screen.getByText('11 rows')).toBeInTheDocument()
    })
  })

  describe('the shop step', () => {
    it('shows the shop page, which calls the API', async () => {
      const level = levels.find((l) => l.id === 'shop-fetch')
      goTo('shop-fetch', { 'shop-fetch': level.solution })
      const { user } = renderWithUser(<PlaygroundView />)

      const shop = within(await screen.findByRole('region', { name: 'Shop page' }, WAIT))
      await user.click((await shop.findAllByRole('button', { name: 'Order 1' }, WAIT))[0])

      expect(await shop.findByText('Order #9 is pending', {}, WAIT)).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'shop.js' })).toBeInTheDocument()
    })
  })
})
