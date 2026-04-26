import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ShieldCheck, LayoutDashboard, Users, Crown, Activity, ServerCog,
  ArrowLeft, Menu, Sun, Moon,
} from 'lucide-react'
import flimasLogo from '../assets/flimas-logo.svg'
import { listUsers, type User } from '../auth'
import AdminOverview from './admin/AdminOverview'
import AdminUsers from './admin/AdminUsers'
import AdminPro from './admin/AdminPro'
import AdminActivity from './admin/AdminActivity'
import AdminSystem from './admin/AdminSystem'

/**
 * AdminPage — página inteira (não modal) dedicada à administração do Flimas.
 * Substitui o antigo `AdminPanel` modal.
 *
 * Layout: sidebar à esquerda (5 abas) + conteúdo principal à direita.
 * Em mobile, a sidebar vira drawer.
 */

export type AdminTab = 'overview' | 'users' | 'pro' | 'activity' | 'system'

interface AdminPageProps {
  /** Usuário admin que está visualizando — não pode se rebaixar/excluir. */
  currentUser: User
  /** Volta para o dashboard. */
  onBack: () => void
  /** Sai do app inteiro (factory reset usa). */
  onLogout: () => void
  /** Avisa o App quando o currentUser tiver alterado (Pro mudou, etc.). */
  onCurrentUserChanged: () => void
  /** Tema atual + toggle (mantém consistência visual com o resto do app). */
  darkMode: boolean
  onToggleTheme: () => void
}

interface TabDef {
  id: AdminTab
  label: string
  icon: React.ReactNode
  description: string
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={16} />, description: 'KPIs e atalhos rápidos.' },
  { id: 'users',    label: 'Usuários',    icon: <Users size={16} />,           description: 'Lista, filtros e ações em massa.' },
  { id: 'pro',      label: 'Plano Pro',   icon: <Crown size={16} />,           description: 'Assinantes Pro e liberações.' },
  { id: 'activity', label: 'Atividade',   icon: <Activity size={16} />,        description: 'Logins e arquivos por usuário.' },
  { id: 'system',   label: 'Sistema',     icon: <ServerCog size={16} />,       description: 'Storage, backup e zona de perigo.' },
]

export default function AdminPage({
  currentUser, onBack, onLogout, onCurrentUserChanged, darkMode, onToggleTheme,
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [users, setUsers] = useState<User[]>(() => listUsers())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const refreshUsers = useCallback(() => {
    setUsers(listUsers().slice().sort((a, b) => a.username.localeCompare(b.username)))
  }, [])

  useEffect(() => {
    refreshUsers()
  }, [refreshUsers])

  // Esc fecha o drawer mobile
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  const totalUsers = users.length
  const totalAdmins = useMemo(() => users.filter(u => u.isAdmin).length, [users])
  const totalPro = useMemo(() => users.filter(u => u.isPro).length, [users])

  const goToTab = useCallback((t: AdminTab) => {
    setActiveTab(t)
    setSidebarOpen(false)
  }, [])

  const sharedProps = {
    users,
    currentUserId: currentUser.id,
    refreshUsers,
    onCurrentUserChanged,
    goToTab,
  }

  let content: React.ReactNode = null
  if (activeTab === 'overview') content = <AdminOverview {...sharedProps} />
  else if (activeTab === 'users') content = <AdminUsers {...sharedProps} />
  else if (activeTab === 'pro') content = <AdminPro {...sharedProps} />
  else if (activeTab === 'activity') content = <AdminActivity {...sharedProps} />
  else if (activeTab === 'system') content = <AdminSystem {...sharedProps} onLogout={onLogout} />

  const activeDef = TABS.find(t => t.id === activeTab) || TABS[0]

  return (
    <div className="min-h-screen bg-[var(--bg-app)] transition-colors duration-500 flex">

      {/* ── Sidebar overlay (mobile) ────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0
        bg-[var(--bg-page)] border-r border-[var(--border-light)]
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-5 py-4 border-b border-[var(--border-light)]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[var(--primary)] transition-colors mb-3"
            title="Voltar para Meus Arquivos"
          >
            <ArrowLeft size={14} />
            Voltar ao workspace
          </button>
          <div className="flex items-center gap-3">
            <img src={flimasLogo} alt="Flimas" className="h-7 w-auto max-w-full" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.25em] px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-sm">
              <ShieldCheck size={10} strokeWidth={3} /> Admin
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">painel</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Seções administrativas">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 mb-2">
            Administração
          </p>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all
                  ${active
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)]'}
                `}
                aria-current={active ? 'page' : undefined}
              >
                <span className={`mt-0.5 ${active ? 'text-[var(--primary)]' : 'text-slate-500 dark:text-slate-400'}`}>
                  {tab.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold leading-none">{tab.label}</span>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    {tab.description}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        {/* Quick stats */}
        <div className="px-4 py-4 border-t border-[var(--border-light)] space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Users" value={totalUsers} accent="violet" />
            <MiniStat label="Admin" value={totalAdmins} accent="blue" />
            <MiniStat label="Pro" value={totalPro} accent="amber" />
          </div>
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)] transition-all"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </span>
            <span className="flex-1 text-left">{darkMode ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Header (desktop + mobile) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-8 py-4 bg-[var(--bg-page)] border-b border-[var(--border-light)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-10 h-10 rounded-lg hover:bg-[var(--bg-ui-hover)] flex items-center justify-center text-slate-600 dark:text-slate-300"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>

          <button
            onClick={onBack}
            className="hidden md:flex w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 items-center justify-center transition-all group"
            title="Voltar para Meus Arquivos"
            aria-label="Voltar para Meus Arquivos"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white truncate">
                Painel Administrativo
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.25em] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-sm">
                <ShieldCheck size={10} strokeWidth={3} /> Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {activeDef.label} · {activeDef.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 text-white font-extrabold text-xs flex items-center justify-center">
                {(currentUser.displayName || currentUser.username).slice(0, 1).toUpperCase()}
              </span>
              <span className="leading-tight">
                <span className="block font-extrabold text-slate-900 dark:text-white">{currentUser.displayName}</span>
                <span className="block text-[10px] font-mono text-slate-400">@{currentUser.username}</span>
              </span>
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 overflow-x-hidden">
          {content}
        </main>
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: {
  label: string
  value: number
  accent: 'violet' | 'blue' | 'amber'
}) {
  const accents: Record<typeof accent, string> = {
    violet: 'from-violet-500 to-purple-500',
    blue:   'from-blue-500 to-sky-500',
    amber:  'from-amber-400 to-orange-500',
  }
  return (
    <div className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-page)] px-2 py-2 text-center">
      <div className={`text-base font-extrabold bg-gradient-to-br ${accents[accent]} bg-clip-text text-transparent leading-none`}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
        {label}
      </div>
    </div>
  )
}
