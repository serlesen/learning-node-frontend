import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithUser } from '../../../test/render.js'
import { DatabasePanel } from './DatabasePanel.jsx'

const tables = [
  { name: 'bricks', columns: ['id', 'name', 'price'], rows: [[1, 'Classic 2x4', 0.25], [2, 'Tile', null]] },
  { name: 'orders', columns: ['id', 'customer'], rows: [] },
]

describe('DatabasePanel', () => {
  describe('tables', () => {
    it('shows the first table with its rows', () => {
      renderWithUser(<DatabasePanel tables={tables} />)

      expect(screen.getByRole('tab', { name: 'bricks' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('2 rows')).toBeInTheDocument()
      expect(screen.getByText('Classic 2x4')).toBeInTheDocument()
      expect(screen.getByText('NULL')).toBeInTheDocument()
    })

    it('switches to another table', async () => {
      const { user } = renderWithUser(<DatabasePanel tables={tables} />)

      await user.click(screen.getByRole('tab', { name: 'orders' }))

      expect(screen.getByRole('columnheader', { name: 'customer' })).toBeInTheDocument()
      expect(screen.getByText('No rows')).toBeInTheDocument()
    })
  })
})
