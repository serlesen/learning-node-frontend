import { render, screen } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { loadLanguage } from '../../services/languageService.js'
import { renderWithUser } from '../../test/render.js'
import { Language } from '../../types/language.js'
import { LanguageSelect } from './LanguageSelect.jsx'

function LogTitle() {
  const { t } = useTranslation()
  return <h1>{t('log.title')}</h1>
}

describe('LanguageSelect', () => {
  describe('rendering', () => {
    it('lists every language by its own name, English selected by default', () => {
      render(<LanguageSelect />)

      const select = screen.getByRole('combobox', { name: 'Language' })
      expect(select).toHaveValue(Language.English)
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'English',
        'Français',
        'Español',
        'Italiano',
        'Deutsch',
      ])
    })
  })

  describe('selection', () => {
    it('switches the texts, the page language and saves the choice', async () => {
      const { user } = renderWithUser(
        <>
          <LogTitle />
          <LanguageSelect />
        </>,
      )

      await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), Language.French)

      expect(screen.getByRole('heading', { name: 'Journal du serveur' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Langue' })).toHaveValue(Language.French)
      expect(document.documentElement).toHaveAttribute('lang', Language.French)
      expect(document.title).toBe('Brick Shop API : apprendre Node.js et Express')
      expect(loadLanguage()).toBe(Language.French)
    })
  })
})
