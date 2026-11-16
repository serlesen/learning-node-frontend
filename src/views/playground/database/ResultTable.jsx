import { useTranslation } from 'react-i18next'
import './ResultTable.scss'

/** The rows of a table, as the database holds them. */
export function ResultTable({ table }) {
  const { t } = useTranslation()

  const renderCell = (cell, i) => {
    if (cell === null) return <td key={i} className="cell-null">{t('database.null')}</td>
    return <td key={i} className={typeof cell === 'number' ? 'cell-number' : undefined}>{cell}</td>
  }

  return (
    <div className="result">
      <div className="result-caption">
        <span>{table.name}</span>
        <span className="result-count">{t('database.rows', { count: table.rows.length })}</span>
      </div>
      <div className="result-scroll">
        <table>
          <thead>
            <tr>
              {table.columns.map((c) => <th key={c} scope="col">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => <tr key={i}>{row.map(renderCell)}</tr>)}
            {table.rows.length === 0 && (
              <tr>
                <td className="cell-empty" colSpan={table.columns.length || 1}>{t('database.noRows')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
