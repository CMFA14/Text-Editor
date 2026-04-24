export type FileKind = 'doc' | 'sheet'

export interface FileEntry {
  id: string
  kind: FileKind
  title: string
  content: string
  lastModified: number
  createdAt: number
}

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
