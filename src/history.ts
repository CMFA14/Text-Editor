import type { FileKind } from './types'

const HISTORY_PREFIX = 'editor_history_'
const MAX_VERSIONS = 10

export interface Snapshot {
  timestamp: number
  title: string
  content: string
  kind: FileKind
}

function key(id: string): string {
  return `${HISTORY_PREFIX}${id}`
}

export function loadHistory(fileId: string): Snapshot[] {
  const raw = localStorage.getItem(key(fileId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Snapshot[]
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore
  }
  return []
}

export function pushSnapshot(fileId: string, snap: Snapshot): Snapshot[] {
  const list = loadHistory(fileId)
  const last = list[0]
  if (last && last.content === snap.content && last.title === snap.title) return list
  const next = [snap, ...list].slice(0, MAX_VERSIONS)
  try {
    localStorage.setItem(key(fileId), JSON.stringify(next))
  } catch (err) {
    console.error('Falha ao gravar histórico', err)
  }
  return next
}

export function clearHistory(fileId: string): void {
  localStorage.removeItem(key(fileId))
}
