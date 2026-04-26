import { useMemo, useState } from 'react'
import {
  Users, Crown, ShieldCheck, FileText, ArrowRight, Database, UserPlus,
} from 'lucide-react'
import { setUserPro, countUserFiles, type User } from '../../auth'
import type { FileKind } from '../../types'
import type { AdminTab } from '../AdminPage'
import { toast } from '../Toast'
import ProBadge from '../ProBadge'

interface AdminOverviewProps {
  users: User[]
  currentUserId: string
  refreshUsers: () => void
  onCurrentUserChanged: () => void
  goToTab: (t: AdminTab) => void
}

export default function AdminOverview({
  users, currentUserId, refreshUsers, onCurrentUserChanged, goToTab,
}: AdminOverviewProps) {
  const [proPickerOpen, setProPickerOpen] = useState(false)

  const totals = useMemo(() => {
    const admins = users.filter(u => u.isAdmin)
    const pros = users.filter(u => u.isPro)
    const conv = users.length === 0 ? 0 : Math.round((pros.length / users.length) * 100)

    // Cadastros nos últimos 7 dias (sparkline com 7 buckets)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const buckets: number[] = Array.from({ length: 7 }, () => 0)
    for (const u of users) {
      const days = Math.floor((today.getTime() - u.createdAt) / (24 * 60 * 60 * 1000))
      if (days >= 0 && days < 7) buckets[6 - days]++
    }
    const last7d = buckets.reduce((a, b) => a + b, 0)

    // Arquivos cross-user
    let totalFiles = 0
    const byKind: Record<FileKind, number> = { doc: 0, sheet: 0, code: 0, image: 0, notes: 0, tasks: 0 }
    for (const u of users) {
      const c = countUserFiles(u.id)
      totalFiles += c.total
      for (const k of Object.keys(c.byKind) as FileKind[]) byKind[k] += c.byKind[k]
    }

    return { admins, pros, conv, buckets, last7d, totalFiles, byKind }
  }, [users])

  const nonProUsers = useMemo(() => users.filter(u => !u.isPro), [users])

  const handleQuickGrantPro = (u: User) => {
    setProPickerOpen(false)
    const next = setUserPro(u.id, true, 'admin')
    if (!next) {
      toast.error('Não foi possível liberar o Pro deste usuário.')
      return
    }
    refreshUsers()
    if (u.id === currentUserId) onCurrentUserChanged()
    toast.success(`Pro liberado para ${u.displayName}.`)
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<Users size={18} />}
          label="Usuários"
          value={users.length}
          accent="violet"
          footer={
            <div className="flex items-end gap-1 h-6 mt-2">
              {totals.buckets.map((v, i) => {
                const max = Math.max(1, ...totals.buckets)
                const h = Math.max(2, Math.round((v / max) * 22))
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${v > 0 ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                    style={{ height: `${h}px` }}
                    title={`${v} cadastro${v === 1 ? '' : 's'}`}
                  />
                )
              })}
            </div>
          }
          captionRight={`+${totals.last7d} em 7 dias`}
        />

        <Kpi
          icon={<ShieldCheck size={18} />}
          label="Admins"
          value={totals.admins.length}
          accent="blue"
          footer={
            <div className="flex items-center -space-x-2 mt-2">
              {totals.admins.slice(0, 5).map(a => (
                <span
                  key={a.id}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-[var(--bg-page)]"
                  title={a.displayName}
                >
                  {(a.displayName || a.username).slice(0, 1).toUpperCase()}
                </span>
              ))}
              {totals.admins.length > 5 && (
                <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[var(--bg-page)]">
                  +{totals.admins.length - 5}
                </span>
              )}
            </div>
          }
        />

        <Kpi
          icon={<Crown size={18} />}
          label="Assinantes Pro"
          value={totals.pros.length}
          accent="amber"
          captionRight={`${totals.conv}% conv.`}
          footer={
            <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: `${totals.conv}%` }}
              />
            </div>
          }
        />

        <Kpi
          icon={<FileText size={18} />}
          label="Arquivos"
          value={totals.totalFiles}
          accent="emerald"
          footer={
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <KindMini label="docs"  value={totals.byKind.doc}   color="violet" />
              <KindMini label="sheet" value={totals.byKind.sheet} color="emerald" />
              <KindMini label="code"  value={totals.byKind.code}  color="sky" />
              <KindMini label="img"   value={totals.byKind.image} color="pink" />
              <KindMini label="notes" value={totals.byKind.notes} color="amber" />
              <KindMini label="tasks" value={totals.byKind.tasks} color="blue" />
            </div>
          }
        />
      </div>

      {/* Quick actions */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] p-5">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">Ações rápidas</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Atalhos para as tarefas administrativas mais comuns.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActionCard
            icon={<Users size={18} />}
            title="Gerenciar usuários"
            subtitle="Tabela completa, filtros e ações em massa."
            onClick={() => goToTab('users')}
            color="violet"
          />

          <div className="relative">
            <ActionCard
              icon={<Crown size={18} />}
              title="Liberar Pro"
              subtitle={nonProUsers.length === 0
                ? 'Todos já são Pro 🎉'
                : `Escolher entre ${nonProUsers.length} usuário${nonProUsers.length === 1 ? '' : 's'}.`}
              onClick={() => nonProUsers.length > 0 && setProPickerOpen(v => !v)}
              color="amber"
              disabled={nonProUsers.length === 0}
            />
            {proPickerOpen && nonProUsers.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProPickerOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-[var(--bg-page)] rounded-xl shadow-xl border border-[var(--border-light)] z-20">
                  {nonProUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleQuickGrantPro(u)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-[var(--primary-light)] dark:hover:bg-slate-800 transition-colors border-b border-[var(--border-light)] last:border-b-0"
                    >
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 text-white text-xs font-extrabold flex items-center justify-center">
                        {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.displayName}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</div>
                      </div>
                      <Crown size={14} className="text-amber-500" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <ActionCard
            icon={<Database size={18} />}
            title="Exportar backup"
            subtitle="Baixe contas + arquivos em um JSON."
            onClick={() => goToTab('system')}
            color="emerald"
          />
        </div>
      </section>

      {/* Self-info card */}
      <section className="rounded-2xl border border-violet-300/60 dark:border-violet-700/40 bg-violet-50/50 dark:bg-violet-950/10 p-5">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <UserPlus size={16} className="text-violet-500" />
          Sua conta
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Você está logado como <b className="text-violet-700 dark:text-violet-300">@{(users.find(u => u.id === currentUserId)?.username) || '—'}</b>.
          Por ser o admin, todas as ações no sistema são feitas em seu nome — incluindo backup,
          liberação de Pro e exclusão de usuários. Por segurança, você não pode rebaixar nem
          excluir a si mesmo pelo painel.
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white">
            <ShieldCheck size={10} /> Admin
          </span>
          {users.find(u => u.id === currentUserId)?.isPro && <ProBadge size="xs" />}
        </div>
      </section>
    </div>
  )
}

function Kpi({
  icon, label, value, accent, footer, captionRight,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  accent: 'violet' | 'blue' | 'amber' | 'emerald'
  footer?: React.ReactNode
  captionRight?: string
}) {
  const accents: Record<typeof accent, { bg: string; text: string }> = {
    violet:  { bg: 'from-violet-500 to-purple-500',   text: 'text-violet-600' },
    blue:    { bg: 'from-blue-500 to-sky-500',        text: 'text-blue-600' },
    amber:   { bg: 'from-amber-400 to-orange-500',    text: 'text-amber-600' },
    emerald: { bg: 'from-emerald-500 to-teal-500',    text: 'text-emerald-600' },
  }
  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent].bg} text-white flex items-center justify-center shrink-0 shadow-md`}>
          {icon}
        </span>
        {captionRight && (
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${accents[accent].text}`}>
            {captionRight}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">{value}</div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      </div>
      {footer}
    </div>
  )
}

function KindMini({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    violet:  'text-violet-600',
    emerald: 'text-emerald-600',
    sky:     'text-sky-600',
    pink:    'text-pink-500',
    amber:   'text-amber-600',
    blue:    'text-blue-600',
  }
  return (
    <div className="px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-1">
      <span className="uppercase">{label}</span>
      <span className={`font-extrabold ${colorMap[color] || ''}`}>{value}</span>
    </div>
  )
}

function ActionCard({
  icon, title, subtitle, onClick, color, disabled,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  color: 'violet' | 'amber' | 'emerald'
  disabled?: boolean
}) {
  const colors: Record<typeof color, string> = {
    violet:  'from-violet-500 to-purple-500',
    amber:   'from-amber-400 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center gap-3 p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] hover:border-[var(--primary)] transition-all text-left ${disabled ? 'opacity-60 cursor-not-allowed hover:border-[var(--border-light)]' : ''}`}
    >
      <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shrink-0 shadow-md`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>
      </div>
      <ArrowRight size={14} className="text-slate-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
    </button>
  )
}
