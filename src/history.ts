import type { FileKind } from './types'
import { userKey } from './auth'

const HISTORY_PREFIX = 'editor_history_'
const MAX_VERSIONS = 10

export interface Snapshot {
  timestamp: number
  title: string
  content: string
  kind: FileKind
}

function key(userId: string, fileId: string): string {
  return userKey(userId, `${HISTORY_PREFIX}${fileId}`)
}

export function loadHistory(userId: string, fileId: string): Snapshot[] {
  const raw = localStorage.getItem(key(userId, fileId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Snapshot[]
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore
  }
  return []
}

export function pushSnapshot(userId: string, fileId: string, snap: Snapshot): Snapshot[] {
  const list = loadHistory(userId, fileId)
  const last = list[0]
  if (last && last.content === snap.content && last.title === snap.title) return list
  const next = [snap, ...list].slice(0, MAX_VERSIONS)
  try {
    localStorage.setItem(key(userId, fileId), JSON.stringify(next))
  } catch (err) {
    console.error('Falha ao gravar histórico', err)
  }
  return next
}

export function clearHistory(userId: string, fileId: string): void {
  localStorage.removeItem(key(userId, fileId))
}
