export type FileKind = 'doc' | 'sheet' | 'code' | 'image' | 'notes'

export interface FileEntry {
  id: string
  kind: FileKind
  title: string
  content: string
  lastModified: number
  createdAt: number
}

/**
 * JSON serializado gravado em FileEntry.content quando kind === 'code'.
 */
export interface CodeFileContent {
  language: CodeLanguage
  code: string
}

export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'sql'
  | 'markdown'
  | 'plaintext'

export interface StorageSchema {
  version: 2
  files: FileEntry[]
}

export interface LegacyDocEntry {
  id: string
  title: string
  content: string
  lastModified: number
}
