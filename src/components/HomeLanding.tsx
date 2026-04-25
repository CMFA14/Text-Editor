import { useMemo } from 'react'
import type { FileKind, FileEntry } from '../types'
import { isProKind } from '../types'
import flimasLogo from '../assets/flimas-logo.svg'
import logoDoc from '../assets/logo-doc.svg'
import logoSheet from '../assets/logo-sheet.svg'
import logoCode from '../assets/logo-flimasCode.png'
import logoStudio from '../assets/logo-flimasStudio.png'
import logoNotes from '../assets/logo-flimasNotes.svg'
import logoTasks from '../assets/logo-flimasTasks.svg'
import { ArrowRight, Clock, Sparkles, Settings as SettingsIcon, FolderOpen, Crown, Check } from 'lucide-react'
import ProBadge from './ProBadge'
import { PRO_BENEFITS, PRO_PRICE_LABEL } from '../pro'

interface HomeLandingProps {
  files: FileEntry[]
  onCreate: (kind: FileKind) => void
  onOpenFiles: () => void
  onOpenFile: (id: string) => void
  onOpenSettings: () => void
  isPro: boolean
  onOpenUpgrade: () => void
}

const PRODUCTS: {
  kind: FileKind
  name: string
  title: string
  subtitle: string
  logo: string
  accent: string
  cardBg: string
  hoverBorder: string
}[] = [
  {
    kind: 'doc',
    name: 'Docs',
    title: 'Flimas Docs',
    subtitle: 'Documentos de texto rico, prontos para publicar.',
    logo: logoDoc,
    accent: 'text-violet-600 dark:text-violet-400',
    cardBg: 'bg-violet-50/60 dark:bg-violet-500/10',
    hoverBorder: 'hover:border-violet-400',
  },
  {
    kind: 'sheet',
    name: 'Sheets',
    title: 'Flimas Sheets',
    subtitle: 'Planilhas com células, fórmulas e exportação nativa.',
    logo: logoSheet,
    accent: 'text-emerald-600 dark:text-emerald-400',
    cardBg: 'bg-emerald-50/60 dark:bg-emerald-500/10',
    hoverBorder: 'hover:border-emerald-400',
  },
  {
    kind: 'code',
    name: 'Code',
    title: 'Flimas Code',
    subtitle: 'Editor de código com realce, temas e snippets.',
    logo: logoCode,
    accent: 'text-sky-600 dark:text-sky-400',
    cardBg: 'bg-sky-50/60 dark:bg-sky-500/10',
    hoverBorder: 'hover:border-sky-400',
  },
  {
    kind: 'image',
    name: 'Studio',
    title: 'Flimas Studio',
    subtitle: 'Edição de imagem em camadas — filtros, texto e formas.',
    logo: logoStudio,
    accent: 'text-pink-600 dark:text-pink-400',
    cardBg: 'bg-pink-50/60 dark:bg-pink-500/10',
    hoverBorder: 'hover:border-pink-400',
  },
  {
    kind: 'notes',
    name: 'Notes',
    title: 'Flimas Notes',
    subtitle: 'Anotações rápidas em Markdown com preview ao vivo.',
    logo: logoNotes,
    accent: 'text-amber-600 dark:text-amber-400',
    cardBg: 'bg-amber-50/60 dark:bg-amber-500/10',
    hoverBorder: 'hover:border-amber-400',
  },
  {
    kind: 'tasks',
    name: 'Tasks',
    title: 'Flimas Tasks',
    subtitle: 'Quadros Kanban para organizar projetos e tarefas.',
    logo: logoTasks,
    accent: 'text-blue-600 dark:text-blue-400',
    cardBg: 'bg-blue-50/60 dark:bg-blue-500/10',
    hoverBorder: 'hover:border-blue-400',
  },
]

export default function HomeLanding({
  files, onCreate, onOpenFiles, onOpenFile, onOpenSettings, isPro, onOpenUpgrade,
}: HomeLandingProps) {
  const recent = useMemo(() => {
    return [...files].sort((a, b) => b.lastModified - a.lastModified).slice(0, 4)
  }, [files])

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      .format(new Date(ts))

  const kindLabel = (k: FileKind) =>
    k === 'doc' ? 'Documento' :
    k === 'sheet' ? 'Planilha' :
    k === 'code' ? 'Código' :
    k === 'notes' ? 'Nota' :
    k === 'tasks' ? 'Quadro' :
    'Imagem'
  const kindLogo = (k: FileKind) =>
    k === 'doc' ? logoDoc :
    k === 'sheet' ? logoSheet :
    k === 'code' ? logoCode :
    k === 'notes' ? logoNotes :
    k === 'tasks' ? logoTasks :
    logoStudio

  return (
    <div className="min-h-screen bg-[var(--bg-app)] transition-colors duration-500">
      {/* Top bar */}
      <header className="sticky top-0 z-20 glass-panel border-b border-[var(--border-light)] px-6 md:px-10 py-3 flex items-center gap-4">
        <img src={flimasLogo} alt="Flimas" className="h-8 w-auto" />
        <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--primary)] ml-1">workspace</span>
        <div className="flex-1" />
        {isPro ? (
          <button
            onClick={onOpenUpgrade}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 transition-colors"
            title="Você é assinante Flimas Pro"
          >
            <Crown size={13} strokeWidth={2.5} />
            PRO ATIVO
          </button>
        ) : (
          <button
            onClick={onOpenUpgrade}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
          >
            <Crown size={13} strokeWidth={2.5} />
            Assinar Pro
          </button>
        )}
        <button
          onClick={onOpenFiles}
          className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 border border-[var(--border-light)] hover:border-[var(--primary)] transition-colors"
        >
          <FolderOpen size={16} />
          Meus arquivos
          {files.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)]">
              {files.length}
            </span>
          )}
        </button>
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/60 border border-[var(--border-light)] hover:border-[var(--primary)] transition-colors"
          title="Configurações"
          aria-label="Configurações"
        >
          <SettingsIcon size={16} />
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-10 pt-12 md:pt-20 pb-10 max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <img src={flimasLogo} alt="Flimas" className="h-20 md:h-24 w-auto select-none" draggable={false} />
          <span className="mt-2 text-xs md:text-sm font-bold uppercase tracking-[0.45em] text-[var(--primary)]">workspace</span>
          <h1 className="mt-6 text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl leading-tight">
            Documentos, planilhas, código, imagens, notas e quadros.
            <span className="block mt-1 bg-clip-text text-transparent" style={{ backgroundImage: 'var(--logo-gradient)' }}>
              Um só workspace.
            </span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Produtividade sem distrações. Todos os seus arquivos salvos localmente,
            com exportação nativa para cada formato.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => onCreate('doc')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
            >
              <Sparkles size={18} />
              Começar agora
            </button>
            <button
              onClick={onOpenFiles}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 border border-[var(--border-light)] hover:border-[var(--primary)] transition-colors"
            >
              <FolderOpen size={18} />
              Ver meus arquivos
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="px-6 md:px-10 pb-16 max-w-6xl mx-auto">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">Produtos</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">O que você quer criar hoje?</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {PRODUCTS.map(p => {
            const isProProduct = isProKind(p.kind)
            const showProBadge = isProProduct && !isPro
            return (
              <button
                key={p.kind}
                onClick={() => onCreate(p.kind)}
                className={`relative group text-left p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-[var(--border-light)] ${p.hoverBorder} transition-all shadow-sm hover:shadow-lg hover:-translate-y-1`}
              >
                {showProBadge && (
                  <span className="absolute top-3 right-3"><ProBadge size="xs" /></span>
                )}
                <div className={`w-14 h-14 rounded-xl ${p.cardBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <img src={p.logo} alt="" className="w-9 h-9" />
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${p.accent}`}>{p.name}</div>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 min-h-[2.75rem]">{p.subtitle}</p>
                <div className={`mt-4 flex items-center gap-1 text-sm font-bold ${p.accent}`}>
                  Criar agora <ArrowRight size={14} />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Plano Pro — teaser */}
      {!isPro && (
        <section className="px-6 md:px-10 pb-16 max-w-6xl mx-auto">
          <div className="rounded-3xl overflow-hidden border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20 shadow-sm">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-8 md:p-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                  <Crown size={12} strokeWidth={3} />
                  Flimas Pro
                </div>
                <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  Desbloqueie todo o workspace.
                </h2>
                <p className="mt-3 text-sm md:text-base text-slate-700 dark:text-slate-300 max-w-md leading-relaxed">
                  Acesso ao <b>Flimas Code</b> e ao <b>Flimas Studio</b>, suporte prioritário
                  e workspace 100% sem anúncios.
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{PRO_PRICE_LABEL.split('/')[0]}</span>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">/mês</span>
                </div>
                <button
                  onClick={onOpenUpgrade}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
                >
                  <Crown size={16} strokeWidth={2.5} />
                  Conhecer o Pro
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="bg-white/60 dark:bg-slate-900/40 p-8 md:p-10 border-t md:border-t-0 md:border-l border-amber-200/60 dark:border-amber-800/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-3">O que vem incluso</p>
                <ul className="space-y-2.5">
                  {PRO_BENEFITS.map(b => (
                    <li key={b.title} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{b.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{b.subtitle}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recentes */}
      {recent.length > 0 && (
        <section className="px-6 md:px-10 pb-16 max-w-6xl mx-auto">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] flex items-center gap-1">
                <Clock size={12} /> Recentes
              </p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Continue de onde parou</h2>
            </div>
            <button
              onClick={onOpenFiles}
              className="text-sm font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent.map(f => (
              <button
                key={f.id}
                onClick={() => onOpenFile(f.id)}
                className="group text-left p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-[var(--border-light)] hover:border-[var(--primary)] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <img src={kindLogo(f.kind)} alt="" className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{f.title || 'Sem título'}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide font-semibold">
                      {kindLabel(f.kind)} · {formatDate(f.lastModified)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-6 md:px-10 pb-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <img src={flimasLogo} alt="Flimas" className="h-6 w-auto opacity-80" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium">
            Seus dados ficam no seu navegador — 100% local, sem envio para servidores.
          </p>
        </div>
      </footer>
    </div>
  )
}
