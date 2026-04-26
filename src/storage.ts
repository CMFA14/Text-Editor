import type { FileEntry, FileKind, LegacyDocEntry, StorageSchema } from './types'
import { userKey } from './auth'

const LEGACY_FILES_KEY = 'editor_files'
const LEGACY_DOCS_KEY = 'editor_docs'
const LEGACY_CONTENT_KEY = 'editor_content'
const LEGACY_TITLE_KEY = 'editor_title'

const CURRENT_VERSION = 2

function filesKey(userId: string): string {
  return userKey(userId, 'files')
}

/**
 * Carrega arquivos do usuário atual. Se não houver nada no namespace dele,
 * tenta migrar dados legacy de root (anterior ao multi-usuário).
 */
export function loadFiles(userId: string): FileEntry[] {
  const raw = localStorage.getItem(filesKey(userId))
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StorageSchema
      if (parsed && Array.isArray(parsed.files)) {
        return parsed.files.map(normalizeFile)
      }
    } catch (err) {
      console.error('Falha ao ler arquivos do usuário', err)
    }
  }

  return migrateLegacyForUser(userId)
}

export function saveFiles(userId: string, files: FileEntry[]): void {
  const schema: StorageSchema = { version: CURRENT_VERSION, files }
  try {
    localStorage.setItem(filesKey(userId), JSON.stringify(schema))
  } catch (err) {
    console.error('Falha ao gravar arquivos do usuário', err)
  }
}

function normalizeFile(raw: Partial<FileEntry>): FileEntry {
  const kind: FileEntry['kind'] =
    raw.kind === 'sheet' ? 'sheet' :
    raw.kind === 'code'  ? 'code'  :
    raw.kind === 'image' ? 'image' :
    raw.kind === 'notes' ? 'notes' :
    raw.kind === 'tasks' ? 'tasks' :
    'doc'
  return {
    id: raw.id || crypto.randomUUID(),
    kind,
    title: raw.title || 'Sem título',
    content: raw.content ?? '',
    lastModified: raw.lastModified ?? Date.now(),
    createdAt: raw.createdAt ?? raw.lastModified ?? Date.now(),
  }
}

/**
 * Faz migração de chaves antigas (sem usuário) para o namespace do usuário fornecido.
 * Útil quando o primeiro usuário se cadastra após um histórico de uso anônimo.
 */
function migrateLegacyForUser(userId: string): FileEntry[] {
  const files: FileEntry[] = []

  // 1) Tenta o formato v2 antigo (root-level editor_files).
  const v2Raw = localStorage.getItem(LEGACY_FILES_KEY)
  if (v2Raw) {
    try {
      const parsed = JSON.parse(v2Raw) as StorageSchema
      if (parsed && Array.isArray(parsed.files)) {
        for (const f of parsed.files) files.push(normalizeFile(f))
      }
    } catch (err) {
      console.error('Falha ao ler editor_files legacy', err)
    }
  }

  // 2) Tenta o v1 antigo (editor_docs).
  if (files.length === 0) {
    const legacyRaw = localStorage.getItem(LEGACY_DOCS_KEY)
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as LegacyDocEntry[]
        if (Array.isArray(legacy)) {
          for (const d of legacy) {
            files.push({
              id: d.id || crypto.randomUUID(),
              kind: 'doc',
              title: d.title || 'Documento sem título',
              content: d.content || '',
              lastModified: d.lastModified || Date.now(),
              createdAt: d.lastModified || Date.now(),
            })
          }
        }
      } catch (err) {
        console.error('Falha ao migrar editor_docs', err)
      }
    }
  }

  // 3) Tenta o pré-multidoc.
  if (files.length === 0) {
    const oldContent = localStorage.getItem(LEGACY_CONTENT_KEY)
    const oldTitle = localStorage.getItem(LEGACY_TITLE_KEY)
    if (oldContent) {
      files.push({
        id: crypto.randomUUID(),
        kind: 'doc',
        title: oldTitle || 'Documento Recuperado',
        content: oldContent,
        lastModified: Date.now(),
        createdAt: Date.now(),
      })
    }
  }

  if (files.length > 0) {
    saveFiles(userId, files)
    // Limpa as chaves legacy para não migrar duas vezes
    try { localStorage.removeItem(LEGACY_FILES_KEY) } catch { /* ignore */ }
  }
  return files
}

export function newFile(kind: FileKind, title?: string, content = ''): FileEntry {
  const now = Date.now()
  const defaultTitle =
    kind === 'doc'   ? 'Documento sem título'  :
    kind === 'sheet' ? 'Planilha sem título'   :
    kind === 'code'  ? 'Código sem título'     :
    kind === 'image' ? 'Imagem sem título'     :
    kind === 'notes' ? 'Nota sem título'       :
    kind === 'tasks' ? 'Quadro sem título'     :
    'Sem título'
  return {
    id: crypto.randomUUID(),
    kind,
    title: title || defaultTitle,
    content,
    lastModified: now,
    createdAt: now,
  }
}
