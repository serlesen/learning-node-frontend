import { useCallback, useMemo, useState } from 'react'
import { useChecks } from '../../hooks/useChecks.js'
import { useCodeComments } from '../../hooks/useCodeComments.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import { useLiveServer } from '../../hooks/useLiveServer.js'
import { useSqlEngine } from '../../hooks/useSqlEngine.js'
import { PublicLayout } from '../../layout/PublicLayout.jsx'
import { useProgressStore } from '../../stores/progressStore.js'
import { EditorTab } from '../../types/editorTab.js'
import { LogKind } from '../../types/logKind.js'
import { Notice } from '../../types/notice.js'
import { fillComments } from '../../utils/codeComments.js'
import { openDatabase } from '../../utils/database.js'
import { CheckList } from './check/CheckList.jsx'
import { HttpClient } from './client/HttpClient.jsx'
import { DatabasePanel } from './database/DatabasePanel.jsx'
import { CodeEditor } from './editor/CodeEditor.jsx'
import { LessonPanel } from './lesson/LessonPanel.jsx'
import { levels } from './levels.js'
import { ServerLog } from './log/ServerLog.jsx'
import { BrowserWindow } from './shop/BrowserWindow.jsx'
import { SHOP_SCRIPT, SHOP_TEXTS } from './shop/shopPage.js'
import { ShopPreview } from './shop/ShopPreview.jsx'
import { SHOP_SEED, SHOP_TABLES } from './shopDatabase.js'
import { StepStrip } from './steps/StepStrip.jsx'
import './PlaygroundView.scss'

const RUN_DELAY = 600
const MAX_LOG_LINES = 200

const notice = (value) => ({ kind: LogKind.Notice, notice: value })
const opener = (SQL) => (SQL ? () => openDatabase(SQL, SHOP_SEED, SHOP_TABLES) : undefined)
const tablesOf = (live) => live?.server?.database()?.tables() || null

export function PlaygroundView() {
  const comments = useCodeComments()
  const progress = useProgressStore()
  const engine = useSqlEngine()
  const [tabChoice, setTabChoice] = useState(null)
  const [runCount, setRunCount] = useState(0)
  // What happened on the running server since it started: the log lines of its requests and its tables.
  const [traffic, setTraffic] = useState({ live: null, entries: [], tables: null, nextId: 0 })

  const index = Math.min(progress.current, levels.length - 1)
  const level = levels[index]
  const code = progress.code[level.id] ?? fillComments(level.js, comments)
  const tab = tabChoice?.id === level.id ? tabChoice.tab : EditorTab.Server
  const hintsShown = progress.hints[level.id] ?? 0
  const isLast = index === levels.length - 1
  const step = index + 1
  const waitingForDb = Boolean(level.database) && !engine.SQL
  const openDb = useMemo(() => opener(engine.SQL), [engine.SQL])
  const levelDb = level.database ? openDb : undefined

  const [ranCode, flushRun] = useDebounced(code, RUN_DELAY, level.id)
  const { live, server } = useLiveServer(ranCode, runCount, levelDb, !waitingForDb)
  const { results, solved } = useChecks(level, ranCode, openDb, !waitingForDb)

  const logEntries = useMemo(() => {
    const errors = live?.error ? [{ kind: LogKind.Error, error: live.error }] : []
    const start = live
      ? [notice(Notice.Restarted), ...live.logs, ...errors]
      : [notice(engine.failed ? Notice.DatabaseFailed : Notice.DatabaseLoading)]
    const requests = traffic.live === live ? traffic.entries : []
    return [...start.map((entry, i) => ({ ...entry, id: `start-${i}` })), ...requests].slice(-MAX_LOG_LINES)
  }, [live, traffic, engine.failed])

  const seedTables = useMemo(() => {
    if (!openDb) return null
    const db = openDb()
    const tables = db.tables()
    db.close()
    return tables
  }, [openDb])

  const tables = useMemo(() => (traffic.live === live && traffic.tables) || seedTables, [live, traffic, seedTables])

  const send = useCallback(
    (spec) =>
      server.handle(spec).then(({ response, logs }) => {
        setTraffic((t) => {
          const kept = t.live === live ? t : { live, entries: [], tables: null, nextId: 0 }
          const added = [...logs, { kind: LogKind.Request, response }].map((entry, i) => ({ ...entry, id: kept.nextId + i }))
          return {
            live,
            entries: [...kept.entries, ...added].slice(-MAX_LOG_LINES),
            tables: tablesOf(live),
            nextId: kept.nextId + added.length,
          }
        })
        return response
      }),
    [server, live],
  )

  const run = () => {
    flushRun()
    setRunCount((n) => n + 1)
  }

  const renderCodeColumn = () => (
    <div className="column column-code">
      <LessonPanel
        key={level.id}
        step={step}
        total={levels.length}
        level={level}
        hintsShown={hintsShown}
        onHint={() => progress.showHint(level.id)}
        onSolution={() => progress.setCode(level.id, fillComments(level.solution, comments))}
      />
      <CodeEditor
        tab={tab}
        onTab={(next) => setTabChoice({ id: level.id, tab: next })}
        code={code}
        shopCode={level.shop ? SHOP_SCRIPT : null}
        onChange={(value) => progress.setCode(level.id, value)}
        onRun={run}
        onReset={() => progress.resetCode(level.id)}
      />
    </div>
  )

  const renderApiColumn = () => (
    <div className="column column-api">
      {level.shop && server && (
        <BrowserWindow address={SHOP_TEXTS.address}>
          <ShopPreview onSend={send} />
        </BrowserWindow>
      )}
      <HttpClient key={level.id} requests={level.requests} stopped={!server} onSend={send} />
      {level.database && tables && <DatabasePanel tables={tables} />}
      <ServerLog entries={logEntries} />
      <CheckList
        levelId={level.id}
        results={results}
        solved={solved}
        onSolved={progress.complete}
        isLast={isLast}
        onNext={() => progress.goTo(index + 1)}
      />
    </div>
  )

  return (
    <PublicLayout
      navigation={<StepStrip levels={levels} current={index} completed={progress.completed} onSelect={progress.goTo} />}
    >
      <main className="workspace">
        {renderCodeColumn()}
        {renderApiColumn()}
      </main>
    </PublicLayout>
  )
}
