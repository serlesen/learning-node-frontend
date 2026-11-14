import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResultTable } from './ResultTable.jsx'
import './DatabasePanel.scss'

/** The tables of the database the running server uses, one at a time. */
export function DatabasePanel({ tables }) {
  const { t } = useTranslation()
  const [chosen, setChosen] = useState(null)

  const table = tables.find((tab) => tab.name === chosen) ?? tables[0]

  return (
    <section className="database" aria-labelledby="database-title">
      <div className="database-head">
        <h2 id="database-title">{t('database.title')}</h2>
        <div role="tablist" aria-label={t('database.tables')} className="database-tabs">
          {tables.map((tab) => (
            <button
              key={tab.name}
              type="button"
              role="tab"
              aria-selected={tab === table}
              className="database-tab"
              onClick={() => setChosen(tab.name)}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>
      {table && <ResultTable table={table} />}
    </section>
  )
}
