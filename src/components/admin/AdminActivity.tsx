import { useMemo } from 'react'
import { Activity, Clock, AlertCircle } from 'lucide-react'
import { countUserFiles, type User } from '../../auth'
import type { FileKind } from '../../types'
import type { AdminTab } from '../AdminPage'

interface AdminActivityProps {
  users: User[]
  currentUserId: string
  refreshUsers: () => void
  onCurrentUserChanged: () => void
  goToTab: (t: AdminTab) => void
}

const KIND_COLORS: Record<FileKind, string> = {
  doc:   'bg-violet-500',
  sheet: 'bg-emerald-500',
  code:  'bg-sky-500',
  image: 'bg-pink-500',
  notes: 'bg-amber-500',
  tasks: 'bg-blue-500',
}

const KIND_LABELS: Record<FileKind, string> = {
  doc:   'Docs',
  sheet: 'Sheets',
  code:  'Code',
  image: 'Studio',
  notes: 'Notes',
  tasks: 'Tasks',
}

function relTime(ts: number | undefined): string {
  if (!ts) return 'Nunca'
  const diff = Date.now() - ts
  const m = Math.floor(diff / (60 * 1000))
  if (m < 1) return 'Agora há pouco'
  if (m < 60) return `${m} min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} dia${d === 1 ? '' : 's'} atrás`
  const months = Math.floor(d / 30)
  return `${months} mês${months === 1 ? '' : 'es'} atrás`
}

export default function AdminActivity({ users }: AdminActivityProps) {
  const enriched = useMemo(() => {
    return users.map(u => {
      const counts = countUserFiles(u.id)
      const inactiveDays = u.lastLoginAt
        ? Math.floor((Date.now() - u.lastLoginAt) / (24 * 60 * 60 * 1000))
        : Infinity
      return { user: u, counts, inactiveDays }
    })
  }, [users])

  const sorted = useMemo(
    () => enriched.slice().sort((a, b) => (b.user.lastLoginAt || 0) - (a.user.lastLoginAt || 0)),
    [enriched],
  )

  const inactive = useMemo(
    () => enriched.filter(e => e.inactiveDays >= 30 && e.inactiveDays !== Infinity).sort((a, b) => b.inactiveDays - a.inactiveDays),
    [enriched],
  )

  const neverLogged = useMemo(
    () => enriched.filter(e => !e.user.lastLoginAt),
    [enriched],
  )

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Inativos card */}
      {(inactive.length > 0 || neverLogged.length > 0) && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-rose-500" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Atenção: {inactive.length + neverLogged.length} usuário{(inactive.length + neverLogged.length) === 1 ? '' : 's'} inativo{(inactive.length + neverLogged.length) === 1 ? '' : 's'}
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            {neverLogged.length > 0 && <>{neverLogged.length} nunca logaram. </>}
            {inactive.length > 0 && <>{inactive.length} sem login há mais de 30 dias.</>}
            {' '}Considere entrar em contato.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...neverLogged, ...inactive].slice(0, 12).map(({ user }) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800/60 border border-rose-100 dark:border-rose-900/40 text-[11px] font-bold text-slate-700 dark:text-slate-200"
              >
                <span className="w-4 h-4 rounded bg-gradient-to-br from-rose-400 to-pink-500 text-white text-[8px] font-extrabold flex items-center justify-center">
                  {(user.displayName || user.username).slice(0, 1).toUpperCase()}
                </span>
                @{user.username}
              </span>
            ))}
            {(inactive.length + neverLogged.length) > 12 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-950/40 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                +{(inactive.length + neverLogged.length) - 12} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Activity table */}
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center gap-2">
          <Activity size={16} className="text-violet-500" />
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Atividade dos usuários</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-[var(--border-light)] bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Último login</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3 text-right">Total arquivos</th>
                <th className="px-4 py-3">Por tipo</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Sem usuários para exibir.</td>
                </tr>
              ) : sorted.map(({ user: u, counts }) => {
                const max = Math.max(1, ...Object.values(counts.byKind))
                const never = !u.lastLoginAt
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-[var(--border-light)] last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${never ? 'bg-rose-50/30 dark:bg-rose-950/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-white text-xs ${u.isAdmin
                          ? 'bg-gradient-to-br from-violet-600 to-pink-500'
                          : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}
                        >
                          {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate">{u.displayName}</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {never ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          Nunca logou
                        </span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{relTime(u.lastLoginAt)}</span>
                          <span className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                            <Clock size={9} />
                            {new Date(u.lastLoginAt as number).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                      {counts.total}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-end gap-1 h-8 min-w-[160px]">
                        {(Object.keys(counts.byKind) as FileKind[]).map(k => {
                          const v = counts.byKind[k]
                          const h = v === 0 ? 2 : Math.max(4, Math.round((v / max) * 30))
                          return (
                            <div key={k} className="flex-1 flex flex-col items-center gap-0.5" title={`${KIND_LABELS[k]}: ${v}`}>
                              <span
                                className={`w-full rounded-sm ${v > 0 ? KIND_COLORS[k] : 'bg-slate-200 dark:bg-slate-700'}`}
                                style={{ height: `${h}px` }}
                              />
                              <span className="text-[8px] font-bold text-slate-400 leading-none">{v}</span>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-[var(--border-light)] flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {(Object.keys(KIND_COLORS) as FileKind[]).map(k => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${KIND_COLORS[k]}`} />
              {KIND_LABELS[k]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
