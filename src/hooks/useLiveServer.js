import { useEffect, useMemo } from 'react'
import { startServer } from '../utils/server.js'

/**
 * The student's server, started from `code` and started again when `code`, `runId` or `openDb` change. Its database
 * opens on the first query and is closed when the server is replaced. `null` while `enabled` is false (the database
 * it needs is not loaded yet).
 * @returns {{ live: (import('../types/entities.js').ServerStart & { runId: number }) | null, server: import('../types/entities.js').Server | null }}
 */
export function useLiveServer(code, runId, openDb, enabled) {
  const live = useMemo(() => (enabled ? { ...startServer(code, { openDb }), runId } : null), [code, runId, openDb, enabled])

  useEffect(() => () => live?.server?.database()?.close(), [live])

  return { live, server: live?.server ?? null }
}
