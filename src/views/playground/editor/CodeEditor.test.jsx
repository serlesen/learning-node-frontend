import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithUser } from '../../../test/render.js'
import { EditorTab } from '../../../types/editorTab.js'
import { CodeEditor } from './CodeEditor.jsx'

const content = () => document.querySelector('.cm-content')

const props = { tab: EditorTab.Server, onTab: () => {}, code: 'const app = 1', onChange: () => {}, onRun: () => {}, onReset: () => {} }

describe('CodeEditor', () => {
  describe('files', () => {
    it('only shows server.js when the step has no shop page', () => {
      renderWithUser(<CodeEditor {...props} />)

      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['server.js'])
    })

    it('shows shop.js as fixed, and reports the chosen tab', async () => {
      const onTab = vi.fn()
      const { user, rerender } = renderWithUser(<CodeEditor {...props} shopCode="fetch('/bricks')" onTab={onTab} />)

      await user.click(screen.getByRole('tab', { name: 'shop.js' }))
      expect(onTab).toHaveBeenCalledWith(EditorTab.Shop)

      rerender(<CodeEditor {...props} tab={EditorTab.Shop} shopCode="fetch('/bricks')" onTab={onTab} />)
      expect(screen.getByText(/The shop page is fixed/)).toBeInTheDocument()
      expect(content()).toHaveTextContent("fetch('/bricks')")
      expect(content()).toHaveAttribute('contenteditable', 'false')
    })
  })

  describe('actions', () => {
    it('runs with the button and with Ctrl+Enter', async () => {
      const onRun = vi.fn()
      const { user } = renderWithUser(<CodeEditor {...props} onRun={onRun} />)

      await user.click(screen.getByRole('button', { name: /Run/ }))
      fireEvent.keyDown(content(), { key: 'Enter', ctrlKey: true })

      expect(onRun).toHaveBeenCalledTimes(2)
    })

    it('starts over', async () => {
      const onReset = vi.fn()
      const { user } = renderWithUser(<CodeEditor {...props} onReset={onReset} />)

      await user.click(screen.getByRole('button', { name: 'Start over' }))

      expect(onReset).toHaveBeenCalledOnce()
    })
  })
})
