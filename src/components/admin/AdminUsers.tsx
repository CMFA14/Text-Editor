import { useMemo, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, X, Crown, ShieldCheck, Trash2, KeyRound, MoreHorizontal, Pencil,
  ChevronDown, AtSign,
} from 'lucide-react'
import {
  setUserPro, setUserAdmin, resetUserPassword, deleteUser, countUserFiles,
  type User,
} from '../../auth'
import type { AdminTab } from '../AdminPage'
import { toast } from '../Toast'
import ProBadge from '../ProBadge'

interface AdminUsersProps {
  users: User[]
  currentUserId: string
  refreshUsers: () => void
  onCurrentUserChanged: () => void
  goToTab: (t: AdminTab) => void
}

type RoleFilter = 'all' | 'admin' | 'user'
type PlanFilter = 'all' | 'pro' | 'free'
type SortBy = 'name' | 'createdAt' | 'lastLogin' | 'files'

export default function AdminUsers({
  users, currentUserId, refreshUsers, onCurrentUserChanged,
}: AdminUsersProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

  // Cache de contagem de arquivos por usuário (evita reler localStorage a cada render)
  const filesByUser = useMemo(() => {
    const map: Record<string, number> = {}
    for (const u of users) map[u.id] = countUserFiles(u.id).total
    return map
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let arr = users.filter(u => {
      if (roleFilter === 'admin' && !u.isAdmin) return false
      if (roleFilter === 'user' && u.isAdmin) return false
      if (planFilter === 'pro' && !u.isPro) return false
      if (planFilter === 'free' && u.isPro) return false
      if (q) {
        if (
          !u.username.includes(q) &&
          !u.displayName.toLowerCase().includes(q) &&
          !(u.email?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
    arr = arr.slice().sort((a, b) => {
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
      if (sortBy === 'createdAt') return b.createdAt - a.createdAt
      if (sortBy === 'lastLogin') return (b.lastLoginAt || 0) - (a.lastLoginAt || 0)
      if (sortBy === 'files') return (filesByUser[b.id] || 0) - (filesByUser[a.id] || 0)
      return 0
    })
    return arr
  }, [users, search, roleFilter, planFilter, sortBy, filesByUser])

  // Limpa selecionados que sumiram
  useEffect(() => {
    setSelected(prev => {
      const next = new Set<string>()
      const ids = new Set(filtered.map(u => u.id))
      for (const id of prev) if (ids.has(id)) next.add(id)
      return next
    })
  }, [filtered])

  // Fecha menu ao escapar / clicar fora
  useEffect(() => {
    if (!menuOpenId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpenId(null) }
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.closest('[data-row-menu]') || t.closest('[data-row-menu-trigger]')) return
      setMenuOpenId(null)
    }
    const onScroll = () => setMenuOpenId(null)
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpenId])

  const openMenuFor = (id: string, btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect()
    const MENU_W = 240
    const margin = 8
    const left = Math.min(window.innerWidth - MENU_W - margin, Math.max(margin, rect.right - MENU_W))
    const top = rect.bottom + 6
    setMenuPos({ top, left })
    setMenuOpenId(id)
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id))

  const toggleAll = () => {
    setSelected(prev => {
      if (allVisibleSelected) return new Set()
      const next = new Set(prev)
      filtered.forEach(u => next.add(u.id))
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedUsers = useMemo(
    () => filtered.filter(u => selected.has(u.id)),
    [filtered, selected],
  )

  const onTogglePro = useCallback((u: User, isPro: boolean) => {
    const updated = setUserPro(u.id, isPro, 'admin')
    if (!updated) {
      toast.error(`Não foi possível atualizar o Pro de ${u.displayName}.`)
      return false
    }
    if (u.id === currentUserId) onCurrentUserChanged()
    return true
  }, [currentUserId, onCurrentUserChanged])

  const onToggleAdmin = useCallback((u: User, isAdmin: boolean) => {
    if (u.id === currentUserId && !isAdmin) {
      toast.warning('Você não pode remover o próprio acesso de admin.')
      return false
    }
    const updated = setUserAdmin(u.id, isAdmin)
    if (!updated) {
      toast.error('Não é possível remover o último admin do sistema.')
      return false
    }
    return true
  }, [currentUserId])

  const onDeleteOne = useCallback((u: User) => {
    if (u.id === currentUserId) {
      toast.warning('Você não pode excluir a própria conta pelo painel.')
      return false
    }
    if (!confirm(`Excluir DEFINITIVAMENTE o usuário "${u.username}"? Todos os arquivos dele serão apagados.`)) return false
    const r = deleteUser(u.id)
    if (!r.ok) {
      toast.error(r.error || 'Não foi possível excluir o usuário.')
      return false
    }
    return true
  }, [currentUserId])

  const handleResetPassword = async (u: User) => {
    const newPw = window.prompt(`Nova senha para "${u.username}" (mín. 6 caracteres):`)
    if (!newPw) return
    const result = await resetUserPassword(u.id, newPw)
    if (!result.ok) toast.error(result.error || 'Não foi possível resetar a senha.')
    else toast.success(`Senha de ${u.displayName} foi atualizada.`)
  }

  const handleRename = (u: User) => {
    const next = window.prompt(`Novo nome de exibição para @${u.username}:`, u.displayName)
    if (!next || next.trim() === '' || next === u.displayName) return
    // Atualizamos localStorage diretamente: re-cria objeto via setUserPro (sem alterar Pro)
    // — porém setUserPro só toca em campos Pro. Vamos fazer por baixo:
    try {
      const raw = localStorage.getItem('flimas_auth_v1')
      if (!raw) return
      const file = JSON.parse(raw) as { version: 1; users: User[] }
      const idx = file.users.findIndex(x => x.id === u.id)
      if (idx < 0) return
      file.users[idx] = { ...file.users[idx], displayName: next.trim() }
      localStorage.setItem('flimas_auth_v1', JSON.stringify(file))
      refreshUsers()
      if (u.id === currentUserId) onCurrentUserChanged()
      toast.success(`Nome alterado para "${next.trim()}".`)
    } catch (err) {
      console.error(err)
      toast.error('Falha ao alterar o nome.')
    }
  }

  // Bulk
  const bulkGrantPro = (grant: boolean) => {
    let count = 0
    for (const u of selectedUsers) {
      if (u.isPro === grant) continue
      if (onTogglePro(u, grant)) count++
    }
    refreshUsers()
    setSelected(new Set())
    toast.success(`${count} usuário${count === 1 ? '' : 's'} ${grant ? 'agora têm' : 'não têm mais'} Pro.`)
  }

  const bulkDelete = () => {
    const targets = selectedUsers.filter(u => u.id !== currentUserId)
    if (targets.length === 0) {
      toast.warning('Você está só selecionado a si mesmo — não posso excluir.')
      return
    }
    if (!confirm(`Excluir ${targets.length} usuário${targets.length === 1 ? '' : 's'} e TODOS os arquivos deles? Não dá pra desfazer.`)) return
    let count = 0
    for (const u of targets) {
      const r = deleteUser(u.id)
      if (r.ok) count++
    }
    refreshUsers()
    setSelected(new Set())
    toast.success(`${count} usuário${count === 1 ? '' : 's'} excluído${count === 1 ? '' : 's'}.`)
  }

  return (
    <div className="space-y-4 max-w-6xl">

      {/* Filters */}
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuário, nome ou e-mail…"
            className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select label="Função" value={roleFilter} onChange={v => setRoleFilter(v as RoleFilter)} options={[
            { value: 'all',   label: 'Todos' },
            { value: 'admin', label: 'Admins' },
            { value: 'user',  label: 'Usuários' },
          ]} />
          <Select label="Plano" value={planFilter} onChange={v => setPlanFilter(v as PlanFilter)} options={[
            { value: 'all',  label: 'Todos' },
            { value: 'pro',  label: 'Pro' },
            { value: 'free', label: 'Free' },
          ]} />
          <Select label="Ordenar" value={sortBy} onChange={v => setSortBy(v as SortBy)} options={[
            { value: 'name',      label: 'Nome' },
            { value: 'createdAt', label: 'Cadastro' },
            { value: 'lastLogin', label: 'Último login' },
            { value: 'files',     label: 'Arquivos' },
          ]} />
        </div>
      </div>

      {/* Bulk bar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20">
          <div className="text-sm font-bold text-violet-900 dark:text-violet-200">
            {selectedUsers.length} usuário{selectedUsers.length === 1 ? '' : 's'} selecionado{selectedUsers.length === 1 ? '' : 's'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => bulkGrantPro(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              <Crown size={12} strokeWidth={2.5} /> Liberar Pro
            </button>
            <button
              onClick={() => bulkGrantPro(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Crown size={12} strokeWidth={2.5} /> Remover Pro
            </button>
            <button
              onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              <Trash2 size={12} strokeWidth={2.5} /> Excluir
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <X size={12} /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* Tabela (desktop) / cards (mobile) */}
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] overflow-hidden">

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-[var(--border-light)] bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todos"
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="px-3 py-3">Usuário</th>
                <th className="px-3 py-3">E-mail</th>
                <th className="px-3 py-3">Plano</th>
                <th className="px-3 py-3">Função</th>
                <th className="px-3 py-3">Cadastrado</th>
                <th className="px-3 py-3">Último login</th>
                <th className="px-3 py-3 text-right">Arquivos</th>
                <th className="px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-sm text-slate-400">
                    Nenhum usuário corresponde aos filtros.
                  </td>
                </tr>
              ) : filtered.map(u => {
                const isMe = u.id === currentUserId
                const isMenuOpen = menuOpenId === u.id
                const isSel = selected.has(u.id)
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-[var(--border-light)] last:border-b-0 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${isSel ? 'bg-violet-50/40 dark:bg-violet-950/10' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleOne(u.id)}
                        aria-label={`Selecionar ${u.displayName}`}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-white text-sm ${u.isAdmin
                          ? 'bg-gradient-to-br from-violet-600 to-pink-500'
                          : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}
                        >
                          {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 dark:text-white truncate">{u.displayName}</span>
                            {isMe && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-violet-600 text-white">
                                Você
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] font-mono text-slate-500 truncate">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {u.email ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-300">
                          <AtSign size={11} className="text-slate-400" /> {u.email}
                        </span>
                      ) : <span className="text-[11px] text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {u.isPro ? <ProBadge size="xs" /> : (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Free</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          <ShieldCheck size={10} /> Admin
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Usuário</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-slate-600 dark:text-slate-300">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-slate-600 dark:text-slate-300">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : (
                        <span className="text-[11px] text-rose-500 font-bold">Nunca</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                      {filesByUser[u.id] || 0}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        data-row-menu-trigger
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isMenuOpen) setMenuOpenId(null)
                          else openMenuFor(u.id, e.currentTarget)
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                        aria-label="Mais opções"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[var(--border-light)]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhum usuário corresponde aos filtros.</div>
          ) : filtered.map(u => {
            const isMe = u.id === currentUserId
            const isSel = selected.has(u.id)
            return (
              <div key={u.id} className={`p-4 flex items-start gap-3 ${isSel ? 'bg-violet-50/40 dark:bg-violet-950/10' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggleOne(u.id)}
                  aria-label={`Selecionar ${u.displayName}`}
                  className="mt-1 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-white text-sm ${u.isAdmin
                  ? 'bg-gradient-to-br from-violet-600 to-pink-500'
                  : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}
                >
                  {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 dark:text-white truncate">{u.displayName}</span>
                    {isMe && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-violet-600 text-white">Você</span>
                    )}
                    {u.isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                    {u.isPro && <ProBadge size="xs" />}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</div>
                  {u.email && <div className="text-[11px] text-slate-500 truncate mt-0.5">{u.email}</div>}
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                    {filesByUser[u.id] || 0} arquivos · cadastrado {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button
                  data-row-menu-trigger
                  onClick={(e) => {
                    e.stopPropagation()
                    if (menuOpenId === u.id) setMenuOpenId(null)
                    else openMenuFor(u.id, e.currentTarget)
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors shrink-0"
                  aria-label="Mais opções"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Menu por linha — em portal */}
      {menuOpenId && menuPos && (() => {
        const u = users.find(x => x.id === menuOpenId)
        if (!u) return null
        return createPortal(
          <div
            data-row-menu
            role="menu"
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: 240, zIndex: 60 }}
            className="bg-[var(--bg-page)] rounded-xl shadow-xl border border-[var(--border-light)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <MenuButton onClick={() => { setMenuOpenId(null); handleRename(u) }} icon={<Pencil size={13} />} label="Editar nome" />
            <MenuButton onClick={() => { setMenuOpenId(null); handleResetPassword(u) }} icon={<KeyRound size={13} />} label="Resetar senha" />
            <MenuButton
              onClick={() => { setMenuOpenId(null); if (onTogglePro(u, !u.isPro)) refreshUsers() }}
              icon={<Crown size={13} className="text-amber-500" />}
              label={u.isPro ? 'Tirar Pro' : 'Liberar Pro'}
            />
            <MenuButton
              onClick={() => { setMenuOpenId(null); if (onToggleAdmin(u, !u.isAdmin)) refreshUsers() }}
              icon={<ShieldCheck size={13} className="text-blue-500" />}
              label={u.isAdmin ? 'Tirar admin' : 'Tornar admin'}
            />
            <div className="border-t border-[var(--border-light)]" />
            <MenuButton
              onClick={() => { setMenuOpenId(null); if (onDeleteOne(u)) refreshUsers() }}
              icon={<Trash2 size={13} />}
              label="Excluir usuário"
              danger
            />
          </div>,
          document.body,
        )
      })()}
    </div>
  )
}

function Select({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      <span>{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none pl-2 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-[var(--bg-page)] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </span>
    </label>
  )
}

function MenuButton({
  onClick, icon, label, danger,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-sm font-semibold transition-colors
        ${danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          : 'text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700'}`}
    >
      {icon} {label}
    </button>
  )
}
