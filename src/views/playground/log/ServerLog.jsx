import { useTranslation } from 'react-i18next'
import { RichText } from '../../../components/rich-text/RichText.jsx'
import { useErrorText } from '../../../hooks/useErrorText.js'
import { LogKind } from '../../../types/logKind.js'
import { LogLevel } from '../../../types/logLevel.js'
import { Outcome } from '../../../types/outcome.js'
import { statusClass, statusText } from '../../../utils/statusText.js'
import './ServerLog.scss'

/** What the terminal running the server would show: requests, `console` output, errors, restarts. */
export function ServerLog({ entries }) {
  const { t } = useTranslation()
  const errorText = useErrorText()

  const renderRequest = ({ response }) => {
    const answered = response.outcome === Outcome.Answered
    return (
      <>
        <span className="log-method">{response.method}</span> {response.path} →{' '}
        {answered ? (
          <span className={`log-status is-${statusClass(response.status)}xx`}>
            {response.status} {statusText(response.status)}
          </span>
        ) : (
          <span className="log-status is-5xx">{t(`log.${response.outcome}`)}</span>
        )}
        <span className="log-time"> · {t('client.time', { ms: response.ms })}</span>
      </>
    )
  }

  const renderEntry = (entry) => {
    const level = entry.kind === LogKind.Error ? LogLevel.Error : (entry.level ?? LogLevel.Log)
    return (
      <li key={entry.id} className={`log-line is-${entry.kind} is-${level}`}>
        {entry.kind === LogKind.Notice && t(`log.notices.${entry.notice}`)}
        {entry.kind === LogKind.Request && renderRequest(entry)}
        {entry.kind === LogKind.Console && entry.text}
        {entry.kind === LogKind.Error && errorText(entry.error)}
      </li>
    )
  }

  return (
    <section className="server-log" aria-labelledby="log-title">
      <h2 id="log-title">{t('log.title')}</h2>
      {entries.length > 0 ? (
        <ol className="log-lines" aria-live="polite">
          {entries.map(renderEntry)}
        </ol>
      ) : (
        <p className="log-empty">
          <RichText text={t('log.empty')} />
        </p>
      )}
    </section>
  )
}
