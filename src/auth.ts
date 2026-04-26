import type { FileKind, FileEntry, StorageSchema } from './types'

/**
 * Flimas Auth — sistema local-first de contas + admin.
 *
 * • Senhas são derivadas com PBKDF2 (SHA-256, 120k iterações, salt de 16 bytes).
 * • O primeiro usuário a se registrar vira automaticamente admin + Pro.
 * • Cada usuário tem seu próprio namespace de armazenamento:
 *     flimas_u_${userId}_files        → arquivos
 *     flimas_u_${userId}_editor_history_${fileId} → histórico
 *
 * Por se tratar de hospedagem estática (sem backend), CADA NAVEGADOR mantém
 * sua própria base local. Isso é perfeito para uso pessoal e demos.
 * Para virar multi-usuário real, ligue o adaptador Supabase em `src/supabase.ts`
 * — a interface pública aqui já foi pensada pra ser trocada (mesmas funções,
 * outra implementação por baixo).
 */

const USERS_KEY = 'flimas_auth_v1'
const SESSION_KEY = 'flimas_session_v1'
const PBKDF2_ITER = 120_000

export interface User {
  id: string
  username: string         // único, lowercase
  displayName: string
  email?: string
  passwordHash: string     // base64
  passwordSalt: string     // base64
  isAdmin: boolean
  isPro: boolean
  proSince?: string
  /** Como o Pro foi concedido. 'admin' = liberado pelo admin, 'self' = ativado em modo dev pelo próprio usuário. */
  proGrantedBy?: 'admin' | 'self'
  createdAt: number
  lastLoginAt?: number
}

interface UsersFile {
  version: 1
  users: User[]
}

interface Session {
  userId: string
  loggedInAt: number
}

// ──────────────────────────────────────────────
// Crypto helpers
// ──────────────────────────────────────────────

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
  return buf
}

async function hashPassword(password: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder()
  // copia para ArrayBuffer "puro" (não SharedArrayBuffer) para satisfazer o tipo BufferSource
  const passwordBytes = enc.encode(password)
  const passwordBuf = new ArrayBuffer(passwordBytes.byteLength)
  new Uint8Array(passwordBuf).set(passwordBytes)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuf,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64ToBuf(saltB64), iterations: PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return bufToB64(bits)
}

function generateSalt(): string {
  const buf = new ArrayBuffer(16)
  crypto.getRandomValues(new Uint8Array(buf))
  return bufToB64(buf)
}

// Comparação resistente a timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ──────────────────────────────────────────────
// Persistence
// ──────────────────────────────────────────────

function loadUsersFile(): UsersFile {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return { version: 1, users: [] }
    const parsed = JSON.parse(raw) as UsersFile
    if (parsed && Array.isArray(parsed.users)) return { version: 1, users: parsed.users }
    return { version: 1, users: [] }
  } catch {
    return { version: 1, users: [] }
  }
}

function saveUsersFile(file: UsersFile): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(file))
  } catch (err) {
    console.error('Falha ao gravar usuários', err)
  }
}

export function listUsers(): User[] {
  return loadUsersFile().users
}

function findByUsername(username: string): User | null {
  const u = username.trim().toLowerCase()
  return listUsers().find(x => x.username === u) || null
}

function findById(userId: string): User | null {
  return listUsers().find(x => x.id === userId) || null
}

function upsertUser(user: User): void {
  const file = loadUsersFile()
  const idx = file.users.findIndex(u => u.id === user.id)
  if (idx >= 0) file.users[idx] = user
  else file.users.push(user)
  saveUsersFile(file)
}

function removeUser(userId: string): void {
  const file = loadUsersFile()
  file.users = file.users.filter(u => u.id !== userId)
  saveUsersFile(file)
}

// ──────────────────────────────────────────────
// Session
// ──────────────────────────────────────────────

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (parsed && typeof parsed.userId === 'string') return parsed
    return null
  } catch {
    return null
  }
}

function writeSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* ignore */ }
}

export function getCurrentUser(): User | null {
  const s = readSession()
  if (!s) return null
  return findById(s.userId)
}

export function getCurrentUserId(): string | null {
  return readSession()?.userId ?? null
}

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

export function validateUsername(username: string): string | null {
  const u = username.trim()
  if (u.length < 3) return 'O nome de usuário precisa ter pelo menos 3 caracteres.'
  if (u.length > 32) return 'O nome de usuário pode ter no máximo 32 caracteres.'
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return 'Use apenas letras, números, ponto, hífen ou underscore.'
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (password.length > 200) return 'Senha muito longa.'
  return null
}

// ──────────────────────────────────────────────
// Auth actions
// ──────────────────────────────────────────────

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string }

export async function register(input: {
  username: string
  password: string
  displayName?: string
  email?: string
}): Promise<AuthResult> {
  const usernameError = validateUsername(input.username)
  if (usernameError) return { ok: false, error: usernameError }
  const passwordError = validatePassword(input.password)
  if (passwordError) return { ok: false, error: passwordError }

  const username = input.username.trim().toLowerCase()
  if (findByUsername(username)) return { ok: false, error: 'Este nome de usuário já está em uso.' }

  const file = loadUsersFile()
  const isFirstUser = file.users.length === 0

  const salt = generateSalt()
  const passwordHash = await hashPassword(input.password, salt)
  const now = Date.now()

  const user: User = {
    id: crypto.randomUUID(),
    username,
    displayName: (input.displayName?.trim() || username),
    email: input.email?.trim() || undefined,
    passwordHash,
    passwordSalt: salt,
    isAdmin: isFirstUser,                     // primeiro usuário = admin
    isPro: isFirstUser,                       // primeiro usuário = Pro
    proSince: isFirstUser ? new Date().toISOString() : undefined,
    proGrantedBy: isFirstUser ? 'admin' : undefined,
    createdAt: now,
    lastLoginAt: now,
  }

  upsertUser(user)
  writeSession({ userId: user.id, loggedInAt: now })

  // Se for o primeiro usuário, migra dados legacy (root-level) para o namespace dele.
  if (isFirstUser) migrateLegacyToUser(user.id)

  return { ok: true, user }
}

export async function login(usernameRaw: string, password: string): Promise<AuthResult> {
  const username = usernameRaw.trim().toLowerCase()
  const user = findByUsername(username)
  if (!user) return { ok: false, error: 'Usuário ou senha inválidos.' }

  const candidate = await hashPassword(password, user.passwordSalt)
  if (!safeEqual(candidate, user.passwordHash)) {
    return { ok: false, error: 'Usuário ou senha inválidos.' }
  }

  const now = Date.now()
  const updated: User = { ...user, lastLoginAt: now }
  upsertUser(updated)
  writeSession({ userId: updated.id, loggedInAt: now })

  return { ok: true, user: updated }
}

export function logout(): void {
  writeSession(null)
}

// ──────────────────────────────────────────────
// Admin actions
// ──────────────────────────────────────────────

export function setUserPro(userId: string, isPro: boolean, grantedBy: 'admin' | 'self' = 'admin'): User | null {
  const u = findById(userId)
  if (!u) return null
  const updated: User = {
    ...u,
    isPro,
    proSince: isPro ? (u.proSince || new Date().toISOString()) : undefined,
    proGrantedBy: isPro ? grantedBy : undefined,
  }
  upsertUser(updated)
  return updated
}

export function setUserAdmin(userId: string, isAdmin: boolean): User | null {
  const u = findById(userId)
  if (!u) return null
  // Não permitimos remover o último admin
  if (!isAdmin) {
    const admins = listUsers().filter(x => x.isAdmin)
    if (admins.length <= 1 && u.isAdmin) return null
  }
  const updated: User = { ...u, isAdmin }
  upsertUser(updated)
  return updated
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const err = validatePassword(newPassword)
  if (err) return { ok: false, error: err }
  const u = findById(userId)
  if (!u) return { ok: false, error: 'Usuário não encontrado.' }
  const salt = generateSalt()
  const hash = await hashPassword(newPassword, salt)
  upsertUser({ ...u, passwordSalt: salt, passwordHash: hash })
  return { ok: true }
}

export function deleteUser(userId: string): { ok: boolean; error?: string } {
  const u = findById(userId)
  if (!u) return { ok: false, error: 'Usuário não encontrado.' }
  // Impede excluir o último admin
  if (u.isAdmin) {
    const admins = listUsers().filter(x => x.isAdmin)
    if (admins.length <= 1) return { ok: false, error: 'Não é possível excluir o único admin.' }
  }
  removeUser(userId)
  // Limpa namespace do usuário
  removeUserNamespace(userId)
  // Se for o usuário atual, sai
  if (getCurrentUserId() === userId) writeSession(null)
  return { ok: true }
}

// ──────────────────────────────────────────────
// Per-user namespacing helpers
// ──────────────────────────────────────────────

const USER_PREFIX = 'flimas_u_'

export function userKey(userId: string, suffix: string): string {
  return `${USER_PREFIX}${userId}_${suffix}`
}

function removeUserNamespace(userId: string): void {
  const prefix = `${USER_PREFIX}${userId}_`
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) keys.push(k)
  }
  keys.forEach(k => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  })
}

// ──────────────────────────────────────────────
// Legacy migration (uma vez, ao criar o primeiro usuário)
// ──────────────────────────────────────────────

const LEGACY_FILES_KEY = 'editor_files'
const LEGACY_HISTORY_PREFIX = 'editor_history_'

export function migrateLegacyToUser(userId: string): void {
  try {
    // Migra arquivos: copia o valor pro namespace do user
    const filesRaw = localStorage.getItem(LEGACY_FILES_KEY)
    if (filesRaw) {
      localStorage.setItem(userKey(userId, 'files'), filesRaw)
      try { localStorage.removeItem(LEGACY_FILES_KEY) } catch { /* ignore */ }
    }
    // Migra histórico de cada arquivo
    const histKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(LEGACY_HISTORY_PREFIX)) histKeys.push(k)
    }
    histKeys.forEach(k => {
      const value = localStorage.getItem(k)
      if (value) {
        const fileId = k.slice(LEGACY_HISTORY_PREFIX.length)
        localStorage.setItem(userKey(userId, `editor_history_${fileId}`), value)
        try { localStorage.removeItem(k) } catch { /* ignore */ }
      }
    })
  } catch (err) {
    console.error('Falha ao migrar dados legacy para o usuário', err)
  }
}

// ──────────────────────────────────────────────
// Stats / Admin helpers
// ──────────────────────────────────────────────

const ALL_FILE_KINDS: FileKind[] = ['doc', 'sheet', 'code', 'image', 'notes', 'tasks']

function emptyByKind(): Record<FileKind, number> {
  return { doc: 0, sheet: 0, code: 0, image: 0, notes: 0, tasks: 0 }
}

/**
 * Conta arquivos do usuário (sem precisar logar como ele).
 * Lê direto a chave `flimas_u_${userId}_files`.
 */
export function countUserFiles(userId: string): { total: number; byKind: Record<FileKind, number> } {
  const byKind = emptyByKind()
  let total = 0
  try {
    const raw = localStorage.getItem(userKey(userId, 'files'))
    if (!raw) return { total: 0, byKind }
    const parsed = JSON.parse(raw) as StorageSchema
    if (parsed && Array.isArray(parsed.files)) {
      for (const f of parsed.files as FileEntry[]) {
        if (ALL_FILE_KINDS.includes(f.kind)) {
          byKind[f.kind]++
          total++
        }
      }
    }
  } catch {
    // ignore JSON corrompido
  }
  return { total, byKind }
}

/**
 * Tamanho aproximado (em bytes) ocupado por todas as chaves do usuário.
 * Usa UTF-16 (cada char ~ 2 bytes).
 */
export function getUserStorageBytes(userId: string): number {
  const prefix = `${USER_PREFIX}${userId}_`
  let bytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(prefix)) continue
    const v = localStorage.getItem(k) || ''
    bytes += (k.length + v.length) * 2
  }
  return bytes
}

/**
 * Tamanho total em bytes ocupado por TODAS as chaves do Flimas em localStorage.
 */
export function getTotalStorageBytes(): { total: number; byKey: Record<string, number> } {
  const byKey: Record<string, number> = {}
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (
      k.startsWith(USER_PREFIX) ||
      k.startsWith('flimas_') ||
      k === 'editor_files' ||
      k === 'editor_docs' ||
      k.startsWith('editor_history_')
    ) {
      const v = localStorage.getItem(k) || ''
      const sz = (k.length + v.length) * 2
      byKey[k] = sz
      total += sz
    }
  }
  return { total, byKey }
}

// ──────────────────────────────────────────────
// Backup / restore (admin)
// ──────────────────────────────────────────────

export interface FlimasBackup {
  version: 1
  exportedAt: string
  /**
   * Inclui hash + salt das senhas — o backup é tão sensível quanto o localStorage.
   * Avise o usuário pra guardar o arquivo em local seguro.
   */
  users: User[]
  /**
   * data[userId] = { files: stringJSON, history: { fileId: stringJSON } }
   * Mantemos como string crua pra evitar reparse e perder estrutura desconhecida.
   */
  data: Record<string, { files: string | null; history: Record<string, string> }>
}

const HISTORY_PREFIX_STR = 'editor_history_'

export function exportAllData(): FlimasBackup {
  const users = listUsers()
  const data: FlimasBackup['data'] = {}
  for (const u of users) {
    const filesKey = userKey(u.id, 'files')
    const filesRaw = localStorage.getItem(filesKey)
    const history: Record<string, string> = {}
    const histPrefix = userKey(u.id, HISTORY_PREFIX_STR)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(histPrefix)) continue
      const fileId = k.slice(histPrefix.length)
      const v = localStorage.getItem(k)
      if (v) history[fileId] = v
    }
    data[u.id] = { files: filesRaw, history }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    data,
  }
}

export function importAllData(backup: FlimasBackup): { ok: boolean; error?: string } {
  if (!backup || backup.version !== 1 || !Array.isArray(backup.users) || !backup.data) {
    return { ok: false, error: 'Arquivo de backup inválido ou em versão incompatível.' }
  }
  try {
    // Substitui a lista de usuários
    saveUsersFile({ version: 1, users: backup.users })
    // Restaura arquivos + histórico de cada usuário
    for (const u of backup.users) {
      const entry = backup.data[u.id]
      if (!entry) continue
      if (entry.files) {
        localStorage.setItem(userKey(u.id, 'files'), entry.files)
      }
      if (entry.history) {
        for (const [fileId, raw] of Object.entries(entry.history)) {
          localStorage.setItem(userKey(u.id, `${HISTORY_PREFIX_STR}${fileId}`), raw)
        }
      }
    }
    return { ok: true }
  } catch (err) {
    console.error('Falha ao importar backup', err)
    return { ok: false, error: 'Erro ao gravar dados restaurados.' }
  }
}

/**
 * Apaga arquivos + histórico de TODOS os usuários (mantém contas + sessão).
 */
export function purgeAllFiles(): void {
  const users = listUsers()
  for (const u of users) {
    const prefix = `${USER_PREFIX}${u.id}_`
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) keys.push(k)
    }
    keys.forEach(k => {
      try { localStorage.removeItem(k) } catch { /* ignore */ }
    })
  }
}

/**
 * Apaga TUDO (contas, arquivos, histórico, sessão, configurações).
 * Equivalente a "redefinir de fábrica" — exige nova conta admin depois.
 */
export function factoryReset(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (
      k.startsWith(USER_PREFIX) ||
      k.startsWith('flimas_') ||
      k === 'editor_files' ||
      k === 'editor_docs' ||
      k === 'editor_content' ||
      k === 'editor_title' ||
      k.startsWith('editor_history_')
    ) keys.push(k)
  }
  keys.forEach(k => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  })
}
