import type { FileEntry, FileKind, LegacyDocEntry, StorageSchema } from './types'

const STORAGE_KEY = 'editor_files'
const LEGACY_DOCS_KEY = 'editor_docs'
const LEGACY_CONTENT_KEY = 'editor_content'
const LEGACY_TITLE_KEY = 'editor_title'

const CURRENT_VERSION = 2

export function loadFiles(): FileEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StorageSchema
      if (parsed && Array.isArray(parsed.files)) {
        return parsed.files.map(normalizeFile)
      }
    } catch (err) {
      console.error('Falha ao ler editor_files, tentando migração', err)
    }
  }

  return migrateLegacy()
}

export function saveFiles(files: FileEntry[]): void {
  const schema: StorageSchema = { version: CURRENT_VERSION, files }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema))
  } catch (err) {
    console.error('Falha ao gravar editor_files no localStorage', err)
  }
}

function normalizeFile(raw: Partial<FileEntry>): FileEntry {
  return {
    id: raw.id || crypto.randomUUID(),
    kind: raw.kind === 'sheet' ? 'sheet' : 'doc',
    title: raw.title || 'Sem título',
    content: raw.content ?? '',
    lastModified: raw.lastModified ?? Date.now(),
    createdAt: raw.createdAt ?? raw.lastModified ?? Date.now(),
  }
}

function migrateLegacy(): FileEntry[] {
  const files: FileEntry[] = []

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

  if (files.length > 0) saveFiles(files)
  return files
}

export function newFile(kind: FileKind, title?: string, content = ''): FileEntry {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    kind,
    title: title || (kind === 'doc' ? 'Documento sem título' : 'Planilha sem título'),
    content,
    lastModified: now,
    createdAt: now,
  }
}

