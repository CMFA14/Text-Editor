import { useState, useMemo, useRef } from 'react'
import {
  Database, HardDrive, Download, Upload, AlertTriangle, FileWarning, Power,
  ServerOff, Server, ExternalLink,
} from 'lucide-react'
import {
  exportAllData, importAllData, purgeAllFiles, factoryReset,
  getTotalStorageBytes, getUserStorageBytes, type User, type FlimasBackup,
} from '../../auth'
import { SUPABASE_READY } from '../../supabase'
import type { AdminTab } from '../AdminPage'
import { toast } from '../Toast'

interface AdminSystemProps {
  users: User[]
  currentUserId: string
  refreshUsers: () => void
  onCurrentUserChanged: () => void
  goToTab: (t: AdminTab) => void
  /** Sai da sessão (usado pelo factory reset). */
  onLogout: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

export default function AdminSystem({
  users, refreshUsers, onLogout,
}: AdminSystemProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetConfirm, setResetConfirm] = useState('')
  const [showSupabaseHelp, setShowSupabaseHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Recompute storage stats when refreshKey changes
  const storage = useMemo(() => {
    void refreshKey
    const total = getTotalStorageBytes()
    const perUser = users.map(u => ({ user: u, bytes: getUserStorageBytes(u.id) }))
      .sort((a, b) => b.bytes - a.bytes)
    const accountedForUsers = perUser.reduce((s, x) => s + x.bytes, 0)
    const other = Math.max(0, total.total - accountedForUsers)
    return { total, perUser, other }
  }, [users, refreshKey])

  const recompute = () => setRefreshKey(k => k + 1)

  const handleExport = () => {
    try {
      const backup = exportAllData()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().slice(0, 10)
      a.download = `flimas-backup-${today}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exportado. Guarde o arquivo em local seguro.')
    } catch (err) {
      console.error(err)
      toast.error('Falha ao exportar backup.')
    }
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as FlimasBackup
      if (!parsed || parsed.version !== 1) {
        toast.error('Arquivo inválido (versão não suportada).')
        return
      }
      const userCount = Array.isArray(parsed.users) ? parsed.users.length : 0
      if (!confirm(`Restaurar backup de ${userCount} usuário${userCount === 1 ? '' : 's'}? Isso vai SOBRESCREVER as contas e arquivos atuais. Continua?`)) return
      const r = importAllData(parsed)
      if (!r.ok) {
        toast.error(r.error || 'Falha ao restaurar backup.')
        return
      }
      refreshUsers()
      recompute()
      toast.success('Backup restaurado. Talvez precise re-logar.')
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível ler o arquivo (JSON inválido?).')
    }
  }

  const handlePurgeFiles = () => {
    if (!confirm('Apagar arquivos e histórico de TODOS os usuários? As contas e senhas são preservadas.')) return
    purgeAllFiles()
    refreshUsers()
    recompute()
    toast.success('Arquivos apagados. As contas continuam ativas.')
  }

  const handleFactoryReset = () => {
    if (resetConfirm !== 'RESETAR') {
      toast.warning('Digite RESETAR para confirmar.')
      return
    }
    if (!confirm('CONFIRMAÇÃO FINAL: apagar TUDO (contas, arquivos, sessão, configurações)? Não há volta.')) return
    factoryReset()
    toast.success('Sistema resetado. Você será deslogado agora.')
    setTimeout(onLogout, 600)
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Backend status ────────────────────────── */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${SUPABASE_READY ? 'bg-gradient-to-br from-blue-500 to-sky-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}`}>
              {SUPABASE_READY ? <Server size={18} /> : <ServerOff size={18} />}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Status do backend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {SUPABASE_READY
                  ? 'Conectado ao Supabase — dados sincronizam entre dispositivos.'
                  : 'Modo local-first — cada navegador tem sua própria base.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md ${SUPABASE_READY ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
              <span className={`w-2 h-2 rounded-full ${SUPABASE_READY ? 'bg-blue-500' : 'bg-emerald-500'} shadow-[0_0_8px_currentColor]`} />
              {SUPABASE_READY ? 'Supabase' : 'Local-first'}
            </span>
            <button
              onClick={() => setShowSupabaseHelp(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700 transition-colors"
            >
              Como ligar o Supabase <ExternalLink size={11} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Storage ───────────────────────────────── */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center shadow-md">
            <HardDrive size={18} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Armazenamento</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total ocupado em <code className="font-mono text-[11px]">localStorage</code>: <b className="text-violet-600">{formatBytes(storage.total.total)}</b>
              <span className="ml-1">(limite típico: 5–10 MB).</span>
            </p>
          </div>
          <div className="flex-1" />
          <button
            onClick={recompute}
            className="text-[11px] font-bold text-slate-500 hover:text-violet-600 transition-colors"
          >
            Recalcular
          </button>
        </div>

        <div className="space-y-1.5">
          {storage.perUser.length === 0 && (
            <div className="text-xs text-slate-400 italic px-2">Sem dados de usuário.</div>
          )}
          {storage.perUser.map(({ user, bytes }) => {
            const pct = storage.total.total === 0 ? 0 : Math.round((bytes / storage.total.total) * 100)
            return (
              <div key={user.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-white text-xs ${user.isAdmin
                  ? 'bg-gradient-to-br from-violet-600 to-pink-500'
                  : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}
                >
                  {(user.displayName || user.username).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span className="truncate">{user.displayName} <span className="text-slate-400 font-mono font-normal">@{user.username}</span></span>
                    <span className="font-mono text-slate-500">{formatBytes(bytes)} · {pct}%</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
          {storage.other > 0 && (
            <div className="px-2 py-1.5 text-[11px] text-slate-500 italic">
              + {formatBytes(storage.other)} em chaves auxiliares (sessão, configurações, legado).
            </div>
          )}
        </div>
      </section>

      {/* ── Backup / Restore ──────────────────────── */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-page)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md">
            <Database size={18} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Backup completo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exporta contas (com hash de senha), arquivos e histórico em um único JSON.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="group flex items-start gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 hover:border-emerald-400 transition-all text-left"
          >
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Download size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Exportar tudo</div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Baixa um <code className="font-mono">flimas-backup-AAAA-MM-DD.json</code> com tudo.
              </div>
            </div>
          </button>

          <button
            onClick={handleImportClick}
            className="group flex items-start gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10 hover:border-blue-400 transition-all text-left"
          >
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Upload size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Importar backup</div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Sobrescreve as contas e arquivos atuais com o conteúdo do JSON.
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
          🔒 <b>Atenção:</b> o JSON contém o hash + salt das senhas. Trate-o como senha — guarde em local seguro.
        </div>
      </section>

      {/* ── Danger zone ───────────────────────────── */}
      <section className="rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Zona de perigo</h2>
            <p className="text-xs text-rose-700/70 dark:text-rose-300/70">
              Ações irreversíveis. Faça um backup antes.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white/60 dark:bg-slate-900/30 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <FileWarning size={16} className="text-rose-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">Apagar arquivos de todos os usuários</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Remove arquivos + histórico de versões. Mantém contas e senhas.
                </div>
              </div>
            </div>
            <button
              onClick={handlePurgeFiles}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
            >
              Apagar arquivos
            </button>
          </div>

          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-100/50 dark:bg-rose-950/20">
            <div className="flex items-start gap-3">
              <Power size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-rose-900 dark:text-rose-200">Resetar de fábrica</div>
                <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mb-2">
                  Apaga TUDO: sua conta admin, todos os usuários, arquivos, histórico, sessão e configurações. Você precisará se cadastrar de novo.
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={resetConfirm}
                    onChange={e => setResetConfirm(e.target.value.toUpperCase())}
                    placeholder="Digite RESETAR para confirmar"
                    className="flex-1 min-w-[200px] px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    onClick={handleFactoryReset}
                    disabled={resetConfirm !== 'RESETAR'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Resetar tudo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supabase help modal */}
      {showSupabaseHelp && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowSupabaseHelp(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-[var(--bg-page)] rounded-2xl shadow-2xl border border-[var(--border-light)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--border-light)] bg-blue-50/50 dark:bg-blue-950/20">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Server size={16} className="text-blue-500" /> Ligando o Supabase
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Resumo dos passos. As instruções completas estão em <code className="font-mono">src/supabase.ts</code>.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed">
              <ol className="list-decimal list-inside space-y-2">
                <li>Crie um projeto em <code className="font-mono text-[11px]">supabase.com</code> (free tier basta).</li>
                <li>Copie o SQL do arquivo <code className="font-mono text-[11px]">src/supabase.ts</code> e cole no SQL Editor (cria tabelas <code>profiles</code>, <code>files</code>, <code>file_history</code> + RLS).</li>
                <li>Crie <code className="font-mono text-[11px]">.env.local</code> com <code className="font-mono text-[11px]">VITE_SUPABASE_URL</code>, <code className="font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> e <code className="font-mono text-[11px]">VITE_USE_SUPABASE=true</code>.</li>
                <li>Rode <code className="font-mono text-[11px]">npm install @supabase/supabase-js</code>.</li>
                <li>Descomente o bloco TODO no final de <code className="font-mono text-[11px]">src/supabase.ts</code> e substitua os reads/writes em <code>auth.ts</code>/<code>storage.ts</code> conforme indicado.</li>
              </ol>
              <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-200">
                A interface pública das funções não muda — só a implementação por baixo. O resto do app continua funcionando.
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border-light)] flex justify-end">
              <button
                onClick={() => setShowSupabaseHelp(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
