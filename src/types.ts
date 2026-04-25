export type FileKind = 'doc' | 'sheet' | 'code' | 'image' | 'notes' | 'tasks'

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

/**
 * JSON serializado gravado em FileEntry.content quando kind === 'tasks'.
 * Estrutura tipo Kanban, configurável (colunas com cor + título).
 */
export interface TasksDoc {
  version: 1
  columns: TaskColumn[]
}

export interface TaskColumn {
  id: string
  title: string
  /** Cor temática da coluna (chave da paleta tailwind: amber, blue, emerald, rose, violet, slate). */
  color: TaskColumnColor
  cards: TaskCard[]
}

export type TaskColumnColor = 'amber' | 'blue' | 'emerald' | 'rose' | 'violet' | 'slate'

export interface TaskCard {
  id: string
  text: string
  /** Detalhes opcionais em texto plano. */
  notes?: string
  /** Carimbo ISO opcional (data limite). */
  due?: string
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

/**
 * Recursos disponíveis apenas no plano Flimas Pro (R$ 19,90/mês).
 * Mantenha a lista alinhada com `isProKind`.
 */
export const PRO_KINDS: ReadonlyArray<FileKind> = ['code', 'image']

export function isProKind(k: FileKind): boolean {
  return PRO_KINDS.includes(k)
}
