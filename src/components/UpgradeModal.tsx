import { useEffect } from 'react'
import { X, Crown, Check, Sparkles } from 'lucide-react'
import { PRO_BENEFITS, PRO_PRICE_LABEL } from '../pro'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  isPro: boolean
  onActivateDev: () => void
  onCancelDev: () => void
  /** Texto opcional explicando por que o modal foi aberto (ex.: tentar criar Code). */
  reason?: string
}

export default function UpgradeModal({
  open, onClose, isPro, onActivateDev, onCancelDev, reason,
}: UpgradeModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-[var(--border-light)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header com gradiente Pro */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center ring-1 ring-white/30">
              <Crown size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] opacity-90">Flimas Pro</p>
              <h2 id="upgrade-title" className="text-2xl font-black leading-tight">
                Desbloqueie tudo
              </h2>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black">{PRO_PRICE_LABEL.split('/')[0]}</span>
            <span className="text-sm font-bold opacity-90">/mês</span>
          </div>
          <p className="mt-1 text-xs font-semibold opacity-90">
            Cancele quando quiser. Sem compromisso.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {reason && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs font-semibold text-amber-800 dark:text-amber-200">
              {reason}
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              O que você ganha
            </p>
            <ul className="space-y-2.5">
              {PRO_BENEFITS.map(b => (
                <li key={b.title} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-ui)]/40 border border-[var(--border-light)]">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{b.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{b.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 px-1 leading-relaxed">
            <Sparkles size={11} className="inline -mt-0.5 mr-1 text-amber-500" />
            Em breve: pagamento via cartão e Pix. Por enquanto, ative o modo de
            desenvolvimento para testar todos os recursos Pro localmente.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-ui)]/40 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Talvez depois
          </button>

          {isPro ? (
            <button
              onClick={() => { onCancelDev(); onClose() }}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Desativar Pro (modo dev)
            </button>
          ) : (
            <button
              onClick={() => { onActivateDev(); onClose() }}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-2 justify-center"
            >
              <Crown size={14} strokeWidth={2.5} />
              Ativar Pro (modo dev)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
