import { useEffect } from 'react'
import { X, Sun, Moon, Monitor, Sparkles, Trash2, Info } from 'lucide-react'
import flimasLogo from '../assets/flimas-logo.svg'

export type ThemePreference = 'light' | 'dark' | 'system'
export type DensityPreference = 'compact' | 'comfortable'

interface SettingsModalProps {
  open: boolean
  onClose: () => void

  themePref: ThemePreference
  onThemeChange: (t: ThemePreference) => void

  density: DensityPreference
  onDensityChange: (d: DensityPreference) => void

  reducedMotion: boolean
  onReducedMotionChange: (v: boolean) => void

  onClearAllData: () => void
  filesCount: number
}

export default function SettingsModal(p: SettingsModalProps) {
  useEffect(() => {
    if (!p.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') p.onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p.open, p])

  if (!p.open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={p.onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-[var(--border-light)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-ui)]/50">
          <img src={flimasLogo} alt="Flimas" className="h-7 w-auto" />
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">Configurações</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Personalize seu workspace</p>
          </div>
          <button
            onClick={p.onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Tema */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Aparência
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Tema do workspace.</p>
            <div className="grid grid-cols-3 gap-3">
              <ThemeCard
                active={p.themePref === 'light'}
                onClick={() => p.onThemeChange('light')}
                icon={<Sun size={18} />}
                label="Claro"
                preview="bg-gradient-to-br from-slate-50 to-violet-50"
              />
              <ThemeCard
                active={p.themePref === 'dark'}
                onClick={() => p.onThemeChange('dark')}
                icon={<Moon size={18} />}
                label="Escuro"
                preview="bg-gradient-to-br from-slate-800 to-slate-950"
              />
              <ThemeCard
                active={p.themePref === 'system'}
                onClick={() => p.onThemeChange('system')}
                icon={<Monitor size={18} />}
                label="Sistema"
                preview="bg-gradient-to-br from-slate-50 via-violet-100 to-slate-800"
              />
            </div>
          </section>

          {/* Densidade */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Densidade
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Quanto espaço os cards e menus devem ocupar.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <OptionCard
                active={p.density === 'comfortable'}
                onClick={() => p.onDensityChange('comfortable')}
                label="Confortável"
                hint="Mais espaço entre elementos"
              />
              <OptionCard
                active={p.density === 'compact'}
                onClick={() => p.onDensityChange('compact')}
                label="Compacto"
                hint="Cabe mais conteúdo na tela"
              />
            </div>
          </section>

          {/* Acessibilidade */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Acessibilidade
            </h3>
            <label className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-light)] bg-white dark:bg-slate-800/50 cursor-pointer hover:border-[var(--primary)] transition-colors">
              <input
                type="checkbox"
                checked={p.reducedMotion}
                onChange={e => p.onReducedMotionChange(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[var(--primary)]"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Reduzir animações</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Desativa transições suaves e micro-animações.
                </p>
              </div>
            </label>
          </section>

          {/* Dados */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Dados
            </h3>
            <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-ui)]/30 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Info size={14} className="text-[var(--primary)]" />
                <span className="text-slate-700 dark:text-slate-300">
                  Você tem <b>{p.filesCount}</b> {p.filesCount === 1 ? 'arquivo' : 'arquivos'} salvos no navegador.
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                Tudo fica em <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono">localStorage</code>. Nenhum dado é enviado para servidores.
              </p>
            </div>

            <button
              onClick={() => {
                if (confirm('Isso apaga TODOS os arquivos salvos neste navegador. Deseja continuar?')) {
                  p.onClearAllData()
                }
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-sm border border-red-100 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <Trash2 size={14} />
              Apagar todos os dados locais
            </button>
          </section>

          {/* Sobre */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Sobre
            </h3>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-[var(--primary-light)] to-transparent border border-[var(--border-light)]">
              <img src={flimasLogo} alt="Flimas" className="h-10 w-auto" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  Flimas Workspace
                  <Sparkles size={12} className="text-[var(--primary)]" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Documentos, planilhas, código e imagens num só lugar — local-first.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-ui)]/40 flex justify-end">
          <button
            onClick={p.onClose}
            className="px-5 py-2 rounded-xl font-bold text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemeCard({
  active, onClick, icon, label, preview,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; preview: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-2 p-3 rounded-xl border transition-all text-left ${
        active
          ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary)]/20'
          : 'border-[var(--border-light)] bg-white dark:bg-slate-800/50 hover:border-[var(--primary)]'
      }`}
      aria-pressed={active}
    >
      <div className={`w-full h-14 rounded-lg ${preview} border border-white/60 dark:border-slate-700/40`} />
      <div className="flex items-center gap-2">
        <span className={active ? 'text-[var(--primary)]' : 'text-slate-500'}>{icon}</span>
        <span className={`text-sm font-bold ${active ? 'text-[var(--primary)]' : 'text-slate-700 dark:text-slate-200'}`}>{label}</span>
      </div>
    </button>
  )
}

function OptionCard({
  active, onClick, label, hint,
}: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 p-4 rounded-xl border transition-all text-left ${
        active
          ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary)]/20'
          : 'border-[var(--border-light)] bg-white dark:bg-slate-800/50 hover:border-[var(--primary)]'
      }`}
      aria-pressed={active}
    >
      <div className={`text-sm font-bold ${active ? 'text-[var(--primary)]' : 'text-slate-900 dark:text-white'}`}>{label}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </button>
  )
}
