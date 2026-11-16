import { javascript } from '@codemirror/lang-javascript'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '../../../components/button/Button.jsx'
import { PlayIcon } from '../../../components/icons/PlayIcon.jsx'
import { ButtonVariant } from '../../../types/buttonVariant.js'
import { EditorTab } from '../../../types/editorTab.js'
import './CodeEditor.scss'

const editorTheme = EditorView.theme({
  '&': { fontSize: 'var(--font-size-code)', height: '100%' },
  '.cm-scroller': { fontFamily: 'var(--font-code)', lineHeight: 'var(--line-height-editor)' },
  '.cm-content': { padding: 'var(--spacing-6) 0' },
  '.cm-gutters': { backgroundColor: 'var(--color-panel-sunk)', border: 'none', color: 'var(--color-ink-faint)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-ink)' },
  '.cm-activeLine': { backgroundColor: 'var(--color-active-line)' },
  '&.cm-focused': { outline: 'none' },
})

const EXTENSIONS = [javascript(), editorTheme]

const SETUP = { foldGutter: false, highlightActiveLine: true, autocompletion: true }

/** `server.js`, and the read-only `shop.js` when the step has a shop page. */
export function CodeEditor({ tab, onTab, code, shopCode, onChange, onRun, onReset }) {
  const { t } = useTranslation()

  const tabs = shopCode ? Object.values(EditorTab) : [EditorTab.Server]
  const isShop = tab === EditorTab.Shop && Boolean(shopCode)
  const shown = isShop ? EditorTab.Shop : EditorTab.Server

  // Captured before CodeMirror, which would insert a blank line.
  const runOnShortcut = (e) => {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    e.stopPropagation()
    onRun()
  }

  const renderTab = (value) => (
    <button
      key={value}
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={shown === value}
      aria-controls="editor-panel"
      className="tab"
      onClick={() => onTab(value)}
    >
      {t(`editor.tabs.${value}`)}
    </button>
  )

  return (
    <section className="editor" aria-label={t('editor.label')}>
      <div className="editor-bar">
        <div role="tablist" aria-label={t('editor.files')} className="tabs">
          {tabs.map(renderTab)}
        </div>
        <div className="editor-actions">
          <Button variant={ButtonVariant.Quiet} onClick={onReset}>
            {t('editor.startOver')}
          </Button>
          <Button variant={ButtonVariant.Primary} className="run-button" onClick={onRun} title={t('editor.runShortcut')}>
            <PlayIcon />
            {t('editor.run')}
          </Button>
        </div>
      </div>
      {isShop && (
        <p className="editor-note">
          <Trans i18nKey="editor.shopFixed" components={{ strong: <strong /> }} />
        </p>
      )}
      <div
        className="editor-body"
        id="editor-panel"
        role="tabpanel"
        aria-labelledby={`tab-${shown}`}
        onKeyDownCapture={runOnShortcut}
      >
        <CodeMirror
          key={shown}
          value={isShop ? shopCode : code}
          height="100%"
          extensions={EXTENSIONS}
          basicSetup={SETUP}
          readOnly={isShop}
          editable={!isShop}
          onChange={(value) => onChange(value)}
          aria-label={t(`editor.code.${shown}`)}
        />
      </div>
    </section>
  )
}
