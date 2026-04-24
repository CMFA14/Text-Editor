import React, { useRef, useState, useMemo, useEffect } from 'react'
import type { FileEntry, FileKind } from '../types'
import flimasLogo from '../assets/flimas-logo.svg'
import logoDoc from '../assets/logo-doc.svg'
import logoSheet from '../assets/logo-sheet.svg'
import logoCode from '../assets/logo-flimasCode.png'
import logoStudio from '../assets/logo-flimasStudio.png'
import logoNotes from '../assets/logo-flimasNotes.svg'
import { Image as ImageIcon, StickyNote, MoreHorizontal, Download, Trash2, Settings as SettingsIcon, Home } from 'lucide-react'
import { getDownloadOptions } from '../utils/download'

interface DashboardProps {
  files: FileEntry[]
  onOpen: (id: string) => void
  onCreate: (kind: FileKind) => void
  onDelete: (id: string) => void
  onImport: (file: File) => void
  darkMode: boolean
  onToggleTheme: () => void
  onGoHome?: () => void
  onOpenSettings?: () => void
}

type FilterKind = 'all' | 'doc' | 'sheet' | 'code' | 'image' | 'notes'

const Icons = {
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  All: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
}

// ── Sidebar item ─────────────────────────────────────
function SideNav({
  icon, label, active, disabled, badge, onClick, accent,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  badge?: string
  onClick?: () => void
  accent?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!!active}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all
        ${active
          ? 'bg-[var(--primary-light)] text-[var(--primary)]'
          : 'text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}
      `}
    >
      <span className={`flex items-center justify-center w-6 h-6 shrink-0 ${accent ? accent : active ? 'text-[var(--primary)]' : 'text-slate-500 dark:text-slate-400'}`}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {badge}
        </span>
      )}
    </button>
  )
}

export default function Dashboard({
  files, onOpen, onCreate, onDelete, onImport, darkMode, onToggleTheme,
  onGoHome, onOpenSettings,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<FilterKind>('all')
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Close per-card menu on Escape or outside-click handled by overlay
  useEffect(() => {
    if (!menuOpenId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpenId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpenId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
      e.target.value = ''
    }
  }

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp))
  }

  const visibleFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => b.lastModified - a.lastModified)
    if (filter === 'all') return sorted
    return sorted.filter(f => f.kind === filter)
  }, [files, filter])

  const counts = useMemo(() => ({
    all: files.length,
    doc: files.filter(f => f.kind === 'doc').length,
    sheet: files.filter(f => f.kind === 'sheet').length,
    code: files.filter(f => f.kind === 'code').length,
    image: files.filter(f => f.kind === 'image').length,
    notes: files.filter(f => f.kind === 'notes').length,
  }), [files])

  const handleCreateClick = (kind: FileKind) => {
    setShowCreateMenu(false)
    onCreate(kind)
  }

  const headerTitle =
    filter === 'doc'   ? 'Flimas Docs' :
    filter === 'sheet' ? 'Flimas Sheets' :
    filter === 'code'  ? 'Flimas Code' :
    filter === 'image' ? 'Flimas Studio' :
    filter === 'notes' ? 'Flimas Notes' :
    'Meus Arquivos'

  const headerSubtitle =
    filter === 'doc'   ? 'Documentos de texto rico.' :
    filter === 'sheet' ? 'Planilhas com células e fórmulas.' :
    filter === 'code'  ? 'Edite, rode e compartilhe trechos de código.' :
    filter === 'image' ? 'Edição avançada de imagens.' :
    filter === 'notes' ? 'Anotações rápidas em Markdown.' :
    'Documentos, planilhas, códigos, imagens e notas em um só lugar.'

  return (
    <div className="min-h-screen bg-[var(--bg-app)] transition-colors duration-500 flex">
      {/* ── Sidebar ───────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0
        bg-[var(--bg-page)] border-r border-[var(--border-light)]
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <button
          onClick={onGoHome}
          className="flex flex-col items-start gap-1.5 px-5 py-4 border-b border-[var(--border-light)] w-full text-left hover:bg-[var(--bg-ui-hover)] transition-colors"
          title="Ir para a tela inicial"
          aria-label="Ir para a tela inicial"
        >
          <img src={flimasLogo} alt="Flimas" className="h-7 w-auto max-w-full" />
          <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.3em] pl-0.5">workspace</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 mb-2">Meus arquivos</p>

          <SideNav
            icon={<Icons.All />}
            label={`Todos (${counts.all})`}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />

          <SideNav
            icon={<img src={logoDoc} alt="" className="w-5 h-5" />}
            label={`Flimas Docs (${counts.doc})`}
            active={filter === 'doc'}
            onClick={() => setFilter('doc')}
          />

          <SideNav
            icon={<img src={logoSheet} alt="" className="w-5 h-5" />}
            label={`Flimas Sheets (${counts.sheet})`}
            active={filter === 'sheet'}
            onClick={() => setFilter('sheet')}
          />

          <SideNav
            icon={<img src={logoCode} alt="" className="w-5 h-5 rounded" />}
            label={`Flimas Code (${counts.code})`}
            active={filter === 'code'}
            onClick={() => setFilter('code')}
          />

          <SideNav
            icon={<img src={logoStudio} alt="" className="w-5 h-5 rounded" />}
            label={`Flimas Studio (${counts.image})`}
            active={filter === 'image'}
            onClick={() => setFilter('image')}
          />

          <SideNav
            icon={<img src={logoNotes} alt="" className="w-5 h-5" />}
            label={`Flimas Notes (${counts.notes})`}
            active={filter === 'notes'}
            onClick={() => setFilter('notes')}
          />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[var(--border-light)] space-y-1">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)] transition-all"
            >
              <span className="w-6 h-6 flex items-center justify-center"><Home size={16} /></span>
              <span className="flex-1 text-left">Início</span>
            </button>
          )}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)] transition-all"
          >
            <span className="w-6 h-6 flex items-center justify-center">{darkMode ? '☀️' : '🌙'}</span>
            <span className="flex-1 text-left">{darkMode ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)] transition-all"
            >
              <span className="w-6 h-6 flex items-center justify-center"><SettingsIcon size={16} /></span>
              <span className="flex-1 text-left">Configurações</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg-page)] border-b border-[var(--border-light)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-lg hover:bg-[var(--bg-ui-hover)] flex items-center justify-center text-slate-600 dark:text-slate-300"
            aria-label="Abrir menu"
          >
            <Icons.Menu />
          </button>
          <img src={flimasLogo} alt="Flimas" className="h-7 w-auto" />
          <span className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-[0.25em]">workspace</span>
          <div className="flex-1" />
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-10 h-10 rounded-lg hover:bg-[var(--bg-ui-hover)] flex items-center justify-center text-slate-600 dark:text-slate-300"
              aria-label="Configurações"
            >
              <SettingsIcon size={16} />
            </button>
          )}
        </header>

        <main className="flex-1 px-6 md:px-10 py-8">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                {headerTitle}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                {headerSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-[var(--bg-page)] text-slate-700 dark:text-slate-200 rounded-xl font-bold border border-[var(--border-light)] hover:border-[var(--primary)] transition-all flex items-center gap-2 shadow-sm text-sm"
              >
                <Icons.Upload />
                Importar
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowCreateMenu(v => !v)}
                  className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm"
                  aria-haspopup="menu"
                  aria-expanded={showCreateMenu}
                >
                  <Icons.Plus />
                  Novo
                </button>
                {showCreateMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCreateMenu(false)} />
                    <div className="absolute right-0 mt-2 w-60 bg-[var(--bg-page)] rounded-xl shadow-xl border border-[var(--border-light)] overflow-hidden z-20" role="menu">
                      <button
                        onClick={() => handleCreateClick('doc')}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors"
                        role="menuitem"
                      >
                        <img src={logoDoc} alt="" className="w-6 h-6" />
                        <div>
                          <div>Novo Documento</div>
                          <div className="text-[11px] font-medium text-slate-500">Flimas Docs</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleCreateClick('sheet')}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors border-t border-[var(--border-light)]"
                        role="menuitem"
                      >
                        <img src={logoSheet} alt="" className="w-6 h-6" />
                        <div>
                          <div>Nova Planilha</div>
                          <div className="text-[11px] font-medium text-slate-500">Flimas Sheets</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleCreateClick('code')}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors border-t border-[var(--border-light)]"
                        role="menuitem"
                      >
                        <img src={logoCode} alt="" className="w-6 h-6" />
                        <div>
                          <div>Novo Código</div>
                          <div className="text-[11px] font-medium text-slate-500">Flimas Code</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleCreateClick('image')}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors border-t border-[var(--border-light)]"
                        role="menuitem"
                      >
                        <img src={logoStudio} alt="" className="w-6 h-6 rounded-md shadow-sm" />
                        <div>
                          <div>Nova Imagem</div>
                          <div className="text-[11px] font-medium text-slate-500">Flimas Studio</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleCreateClick('notes')}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors border-t border-[var(--border-light)]"
                        role="menuitem"
                      >
                        <img src={logoNotes} alt="" className="w-6 h-6" />
                        <div>
                          <div>Nova Nota</div>
                          <div className="text-[11px] font-medium text-slate-500">Flimas Notes</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".html,.htm,.md,.markdown,.txt,.xlsx,.xls,.csv,.js,.ts,.tsx,.jsx,.py,.css,.json,.sql"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="dashboard-grid">
            {(filter === 'all' || filter === 'doc') && (
              <button onClick={() => handleCreateClick('doc')} className="action-card group">
                <img src={logoDoc} alt="" className="w-14 h-14 group-hover:scale-110 transition-transform" />
                <span className="action-card-text">Novo Documento</span>
              </button>
            )}

            {(filter === 'all' || filter === 'sheet') && (
              <button onClick={() => handleCreateClick('sheet')} className="action-card group">
                <img src={logoSheet} alt="" className="w-14 h-14 group-hover:scale-110 transition-transform" />
                <span className="action-card-text">Nova Planilha</span>
              </button>
            )}

            {(filter === 'all' || filter === 'code') && (
              <button onClick={() => handleCreateClick('code')} className="action-card group">
                <img src={logoCode} alt="" className="w-14 h-14 rounded-2xl shadow-md group-hover:scale-110 transition-transform" />
                <span className="action-card-text">Novo Código</span>
              </button>
            )}

            {(filter === 'all' || filter === 'image') && (
              <button onClick={() => handleCreateClick('image')} className="action-card group">
                <img src={logoStudio} alt="" className="w-14 h-14 rounded-2xl shadow-md group-hover:scale-110 transition-transform" />
                <span className="action-card-text">Nova Imagem</span>
              </button>
            )}

            <button onClick={() => fileInputRef.current?.click()} className="action-card group">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                <Icons.Upload />
              </div>
              <span className="action-card-text text-slate-500">Importar arquivo</span>
            </button>

            {visibleFiles.map(file => {
              const fileLogo =
                file.kind === 'sheet' ? logoSheet :
                file.kind === 'code'  ? logoCode  :
                file.kind === 'image' ? logoStudio :
                logoDoc
              const fileKindLabel =
                file.kind === 'sheet' ? 'Planilha' :
                file.kind === 'code'  ? 'Código'   :
                file.kind === 'image' ? 'Imagem'   :
                'Documento'
              const downloadOptions = getDownloadOptions(file)
              const isMenuOpen = menuOpenId === file.id
              return (
              <div key={file.id} className="doc-card relative" onClick={() => onOpen(file.id)}>
                <img src={fileLogo} alt="" className="w-12 h-12 rounded-xl shadow-sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="doc-card-title truncate" title={file.title}>
                    {file.title || 'Sem título'}
                  </h3>
                  <p className="doc-card-date mt-1">
                    {fileKindLabel} · {formatDate(file.lastModified)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenId(isMenuOpen ? null : file.id)
                    }}
                    title="Mais opções"
                    aria-label="Mais opções"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(null) }}
                    />
                    <div
                      className="absolute right-3 top-12 z-40 w-60 bg-[var(--bg-page)] rounded-xl shadow-xl border border-[var(--border-light)] overflow-hidden"
                      role="menu"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Download size={10} /> Baixar como
                      </div>
                      {downloadOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={async () => {
                            setMenuOpenId(null)
                            try { await opt.run() } catch (err) { console.error(err) }
                          }}
                          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors"
                          role="menuitem"
                        >
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="truncate">{opt.label}</span>
                            {opt.hint && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{opt.hint}</span>}
                          </div>
                          <Download size={14} className="text-slate-400 shrink-0" />
                        </button>
                      ))}
                      <div className="border-t border-[var(--border-light)]" />
                      <button
                        onClick={() => {
                          setMenuOpenId(null)
                          onDelete(file.id)
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        role="menuitem"
                      >
                        <Trash2 size={14} />
                        Excluir arquivo
                      </button>
                    </div>
                  </>
                )}
              </div>
              )
            })}
          </div>

          {visibleFiles.length === 0 && (
            <div className="mt-20 flex flex-col items-center justify-center text-center opacity-60">
              {filter === 'sheet' ? (
                <img src={logoSheet} alt="" className="w-20 h-20 mb-4" />
              ) : filter === 'doc' ? (
                <img src={logoDoc} alt="" className="w-20 h-20 mb-4" />
              ) : filter === 'code' ? (
                <img src={logoCode} alt="" className="w-20 h-20 mb-4" />
              ) : filter === 'image' ? (
                <div className="w-20 h-20 mb-4 rounded-xl flex items-center justify-center text-pink-500 bg-pink-100/50 dark:bg-pink-900/30">
                  <ImageIcon size={48} />
                </div>
              ) : (
                <div className="text-6xl mb-4">📂</div>
              )}
              <h3 className="text-xl font-bold">
                {filter === 'all'   ? 'Nenhum arquivo ainda'    :
                 filter === 'doc'   ? 'Nenhum documento ainda'  :
                 filter === 'sheet' ? 'Nenhuma planilha ainda'  :
                 filter === 'image' ? 'Nenhuma imagem ainda'    :
                                      'Nenhum código ainda'}
              </h3>
              <p className="max-w-xs mt-2 text-slate-500 dark:text-slate-400">
                Comece criando um novo arquivo ou importando um existente.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
