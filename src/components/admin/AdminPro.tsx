import { useMemo, useState } from 'react'
import { Crown, ShieldCheck, UserCheck, Sparkles } from 'lucide-react'
import { setUserPro, type User } from '../../auth'
import { PRO_PRICE_LABEL, PRO_BENEFITS } from '../../pro'
import type { AdminTab } from '../AdminPage'
import { toast } from '../Toast'

interface AdminProProps {
  users: User[]
  currentUserId: string
  refreshUsers: () => void
  onCurrentUserChanged: () => void
  goToTab: (t: AdminTab) => void
}

function daysSince(iso: string | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)))
}

export default function AdminPro({
  users, currentUserId, refreshUsers, onCurrentUserChanged,
}: AdminProProps) {
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  const proUsers = useMemo(
    () => users.filter(u => u.isPro).slice().sort((a, b) => {
      const da = a.proSince ? new Date(a.proSince).getTime() : 0
      const db = b.proSince ? new Date(b.proSince).getTime() : 0
      return db - da
    }),
    [users],
  )

  const stats = useMemo(() => {
    const byAdmin = proUsers.filter(u => u.proGrantedBy === 'admin').length
    const bySelf  = proUsers.filter(u => u.proGrantedBy === 'self').length
    const unknown = proUsers.length - byAdmin - bySelf
    const conv    = users.length === 0 ? 0 : Math.round((proUsers.length / users.length) * 100)
    return { byAdmin, bySelf, unknown, conv }
  }, [proUsers, users.length])

  const nonProUsers = useMemo(() => users.filter(u => !u.isPro), [users])

  const toggleBulk = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = nonProUsers.length > 0 && nonProUsers.every(u => bulkSelected.has(u.id))
  const toggleAll = () => {
    if (allSelected) setBulkSelected(new Set())
    else setBulkSelected(new Set(nonProUsers.map(u => u.id)))
  }

  const applyBulk = () => {
    let count = 0
    for (const id of bulkSelected) {
      const u = users.find(x => x.id === id)
      if (!u) continue
      const next = setUserPro(u.id, true, 'admin')
      if (next) {
        count++
        if (u.id === currentUserId) onCurrentUserChanged()
      }
    }
    refreshUsers()
    setBulkSelected(new Set())
    setBulkOpen(false)
    toast.success(`${count} usuário${count === 1 ? '' : 's'} agora ${count === 1 ? 'tem' : 'têm'} Pro.`)
  }

  const handleRemovePro = (u: User) => {
    if (!confirm(`Remover Pro de "${u.displayName}"?`)) return
    const next = setUserPro(u.id, false, 'admin')
    if (!next) {
      toast.error('Não foi possível remover o Pro.')
      return
    }
    refreshUsers()
    if (u.id === currentUserId) onCurrentUserChanged()
    toast.success(`Pro removido de ${u.displayName}.`)
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ProStat label="Total Pro"        value={proUsers.length} sub={`${stats.conv}% conv.`} accent="amber" icon={<Crown size={16} />} />
        <ProStat label="Liberados Admin"  value={stats.byAdmin}   sub="por @admins" accent="violet" icon={<ShieldCheck size={16} />} />
        <ProStat label="Auto-ativados"    value={stats.bySelf}    sub="modo dev" accent="blue" icon={<Sparkles size={16} />} />
        <ProStat label="Sem origem"       value={stats.unknown}   sub="herdados" accent="slate" icon={<UserCheck size={16} />} />
      </div>

      {/* Tabela Pro */}
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Assinantes Pro</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ordenado por data de upgrade (mais recentes primeiro).</p>
          </div>
          <button
            onClick={() => setBulkOpen(true)}
            disabled={nonProUsers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Crown size={12} strokeWidth={2.5} /> Liberar em massa
          </button>
        </div>

        {proUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Nenhum assinante Pro ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-[var(--border-light)] bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Data de upgrade</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3 text-right">Tempo Pro</th>
                  <th className="px-4 py-3 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {proUsers.map(u => {
                  const days = daysSince(u.proSince)
                  return (
                    <tr key={u.id} className="border-b border-[var(--border-light)] last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-white text-xs ${u.isAdmin
                            ? 'bg-gradient-to-br from-violet-600 to-pink-500'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                          >
                            {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white truncate">{u.displayName}</div>
                            <div className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-700 dark:text-slate-300">
                        {u.proSince ? new Date(u.proSince).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <OriginBadge origin={u.proGrantedBy} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                        {u.proSince ? `${days}d` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemovePro(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
                        >
                          Remover Pro
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card de configuração / preço */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/60 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/10 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
            <Crown size={18} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Plano Flimas Pro</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Preço atual: <b className="text-amber-700 dark:text-amber-300">{PRO_PRICE_LABEL}</b> · Sem cobrança automática (modo local-first).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRO_BENEFITS.map(b => (
            <div key={b.title} className="rounded-xl bg-white/60 dark:bg-slate-900/40 border border-amber-100 dark:border-amber-900/30 p-3">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">{b.title}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{b.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setBulkOpen(false)}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-[var(--bg-page)] rounded-2xl shadow-2xl border border-[var(--border-light)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--border-light)] bg-amber-50/50 dark:bg-amber-950/20">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Liberar Pro em massa</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione os usuários que devem virar Pro. Esta ação é instantânea (sem cobrança).
              </p>
            </div>

            <div className="px-5 py-2 border-b border-[var(--border-light)] flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Selecionar todos ({nonProUsers.length})
              </label>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                {bulkSelected.size} selecionado{bulkSelected.size === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 max-h-[50vh]">
              {nonProUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">Todos os usuários já são Pro 🎉</div>
              ) : nonProUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(u.id)}
                    onChange={() => toggleBulk(u.id)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 text-white text-xs font-extrabold flex items-center justify-center">
                    {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.displayName}</div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-[var(--border-light)] flex items-center justify-end gap-2">
              <button
                onClick={() => setBulkOpen(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={applyBulk}
                disabled={bulkSelected.size === 0}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Liberar Pro ({bulkSelected.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProStat({ label, value, sub, accent, icon }: {
  label: string
  value: number
  sub: string
  accent: 'amber' | 'violet' | 'blue' | 'slate'
  icon: React.ReactNode
}) {
  const accents: Record<typeof accent, string> = {
    amber:  'from-amber-400 to-orange-500',
    violet: 'from-violet-500 to-purple-500',
    blue:   'from-blue-500 to-sky-500',
    slate:  'from-slate-400 to-slate-600',
  }
  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] p-3 flex items-center gap-3">
      <span className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accents[accent]} text-white flex items-center justify-center shrink-0 shadow-sm`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        <div className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}

function OriginBadge({ origin }: { origin?: 'admin' | 'self' }) {
  if (origin === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
        <ShieldCheck size={10} /> Admin
      </span>
    )
  }
  if (origin === 'self') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Sparkles size={10} /> Auto
      </span>
    )
  }
  return <span className="text-[10px] text-slate-400 italic">Desconhecida</span>
}
