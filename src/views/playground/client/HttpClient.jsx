import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/button/Button.jsx'
import { RichText } from '../../../components/rich-text/RichText.jsx'
import { ButtonVariant } from '../../../types/buttonVariant.js'
import { ClientTab } from '../../../types/clientTab.js'
import { HttpMethod } from '../../../types/httpMethod.js'
import { Outcome } from '../../../types/outcome.js'
import { parseHeaderLines, prettyBody } from '../../../utils/body.js'
import { toRequestSpec } from '../../../utils/checks.js'
import { REQUEST_TIMEOUT } from '../../../utils/express.js'
import { HOST } from '../../../utils/host.js'
import { statusClass, statusText } from '../../../utils/statusText.js'
import './HttpClient.scss'

const draftOf = (request) => ({ method: request.method, url: request.url, body: request.body ?? '', headers: request.headers ?? '' })
const label = (request) => `${request.method} ${request.url}`

/**
 * A small Postman: writes a request, sends it to the student's server with `onSend` and shows the response.
 * `requests` are the ready-made requests of the step; the first one fills the client at the start.
 */
export function HttpClient({ requests, stopped, onSend }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => draftOf(requests[0]))
  const [requestTab, setRequestTab] = useState(() => (requests[0].headers ? ClientTab.Headers : ClientTab.Body))
  const [responseTab, setResponseTab] = useState(ClientTab.Body)
  const [response, setResponse] = useState(null)
  const [sending, setSending] = useState(false)

  const update = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }))

  const send = (request) => {
    setSending(true)
    const spec = toRequestSpec(request.method, request.url.trim() || '/', {
      body: request.body.trim() || undefined,
      headers: parseHeaderLines(request.headers),
    })
    onSend(spec)
      .then(setResponse)
      .catch(() => setResponse(null))
      .finally(() => setSending(false))
  }

  const submit = (e) => {
    e.preventDefault()
    send(draft)
  }

  const applyPreset = (request) => {
    const next = draftOf(request)
    setDraft(next)
    if (request.headers) setRequestTab(ClientTab.Headers)
    else if (request.body) setRequestTab(ClientTab.Body)
    send(next)
  }

  const renderTabs = (current, onSelect, labelKey, idPrefix) => (
    <div role="tablist" aria-label={t(labelKey)} className="client-tabs">
      {Object.values(ClientTab).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          id={`${idPrefix}-${value}`}
          aria-selected={current === value}
          className="client-tab"
          onClick={() => onSelect(value)}
        >
          {t(`client.tabs.${value}`)}
        </button>
      ))}
    </div>
  )

  const renderRequestFields = () => (
    <div className="client-request">
      {renderTabs(requestTab, setRequestTab, 'client.requestTabs', 'request')}
      {requestTab === ClientTab.Body ? (
        <textarea
          className="client-text"
          aria-label={t('client.body')}
          value={draft.body}
          onChange={update('body')}
          rows={4}
          spellCheck={false}
        />
      ) : (
        <textarea
          className="client-text"
          aria-label={t('client.headers')}
          value={draft.headers}
          onChange={update('headers')}
          rows={4}
          spellCheck={false}
        />
      )}
    </div>
  )

  const renderHeaders = () => (
    <dl className="client-headers">
      {Object.entries(response.headers).map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )

  const renderBody = () =>
    response.body ? (
      <pre className="client-body">
        <code>{prettyBody(response.body, response.headers['content-type'])}</code>
      </pre>
    ) : (
      <p className="client-muted">{t('client.noBody')}</p>
    )

  const renderAnswer = () => (
    <>
      <div className="client-status">
        <span className={`status-badge is-${statusClass(response.status)}xx`}>
          {response.status} {statusText(response.status)}
        </span>
        <span className="client-muted">{t('client.time', { ms: response.ms })}</span>
      </div>
      {renderTabs(responseTab, setResponseTab, 'client.responseTabs', 'response')}
      {responseTab === ClientTab.Body ? renderBody() : renderHeaders()}
    </>
  )

  const renderResponse = () => {
    if (stopped) return <p className="client-warning">{t('client.stopped')}</p>
    if (!response) return <p className="client-muted">{t('client.empty')}</p>
    if (response.outcome === Outcome.NoResponse) {
      return (
        <p className="client-warning">
          <RichText text={t('client.noResponse')} />
        </p>
      )
    }
    if (response.outcome === Outcome.Timeout) {
      return <p className="client-warning">{t('client.timeout', { seconds: REQUEST_TIMEOUT / 1000 })}</p>
    }
    return renderAnswer()
  }

  return (
    <section className="client" aria-labelledby="client-title">
      <h2 id="client-title">{t('client.label')}</h2>
      <form className="client-bar" onSubmit={submit}>
        <select className="client-method" aria-label={t('client.method')} value={draft.method} onChange={update('method')}>
          {Object.values(HttpMethod).map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
        <label className="client-url">
          <span className="client-origin">{HOST}</span>
          <input aria-label={t('client.url')} value={draft.url} onChange={update('url')} spellCheck={false} />
        </label>
        <Button type="submit" variant={ButtonVariant.Primary} disabled={sending || stopped}>
          {t('client.send')}
        </Button>
      </form>

      <div className="client-presets">
        <span className="client-muted">{t('client.presets')}</span>
        {requests.map((request) => (
          <button
            key={label(request) + (request.headers ?? '') + (request.body ?? '')}
            type="button"
            className="preset"
            aria-label={t('client.preset', { request: label(request) })}
            disabled={sending || stopped}
            onClick={() => applyPreset(request)}
          >
            <span className="preset-method">{request.method}</span> {request.url}
          </button>
        ))}
      </div>

      {renderRequestFields()}

      <div className="client-response" aria-live="polite">
        <h3>{t('client.response')}</h3>
        {renderResponse()}
      </div>
    </section>
  )
}
