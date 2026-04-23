import React, { useRef, useState, useMemo } from 'react'
import type { FileEntry, FileKind } from '../types'

interface DashboardProps {
  files: FileEntry[]
  onOpen: (id: string) => void
  onCreate: (kind: FileKind) => void
  onDelete: (id: string) => void
  onImport: (file: File) => void
  darkMode: boolean
  onToggleTheme: () => void
}

type FilterKind = 'all' | 'doc' | 'sheet'

const Icons = {
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Doc: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Sheet: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
}

export default function Dashboard({
  files, onOpen, onCreate, onDelete, onImport, darkMode, onToggleTheme
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<FilterKind>('all')
  const [showCreateMenu, setShowCreateMenu] = useState(false)

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

  const handleCreateClick = (kind: FileKind) => {
    setShowCreateMenu(false)
    onCreate(kind)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] transition-colors duration-500">
      <header className="glass-panel sticky top-0 z-[60] flex items-center justify-between px-8 py-4 border-b border-white/10 select-none shadow-sm mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <span className="text-xl text-white">📝</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight leading-none bg-clip-text text-transparent" style={{ backgroundImage: 'var(--logo-gradient)' }}>DocFlex</span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Meus Arquivos</span>
          </div>
        </div>

        <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] flex items-center justify-center transition-all group overflow-hidden relative border border-slate-200 dark:border-slate-700"
            aria-label="Alternar tema"
        >
            <div className={`transition-transform duration-500 ${darkMode ? 'translate-y-12' : 'translate-y-0'}`}>🌙</div>
            <div className={`absolute transition-transform duration-500 ${darkMode ? 'translate-y-0' : '-translate-y-12'}`}>☀️</div>
        </button>
      </header>

      <div className="dashboard-container !py-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Meus Arquivos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Documentos e planilhas em um só lugar.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center gap-2 shadow-sm"
            >
              <Icons.Upload />
              Importar
            </button>
            <div className="relative">
              <button
                onClick={() => setShowCreateMenu(v => !v)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                aria-haspopup="menu"
                aria-expanded={showCreateMenu}
              >
                <Icons.Plus />
                Novo
              </button>
              {showCreateMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCreateMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20" role="menu">
                    <button
                      onClick={() => handleCreateClick('doc')}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                      role="menuitem"
                    >
                      <span className="text-xl">📝</span>
                      <div>
                        <div>Novo Documento</div>
                        <div className="text-[11px] font-medium text-slate-500">Texto rico (.docx-style)</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleCreateClick('sheet')}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
                      role="menuitem"
                    >
                      <span className="text-xl">📊</span>
                      <div>
                        <div>Nova Planilha</div>
                        <div className="text-[11px] font-medium text-slate-500">Células e fórmulas (.xlsx-style)</div>
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
              accept=".html,.htm,.md,.markdown,.txt,.xlsx,.xls,.csv"
              onChange={handleFileChange}
            />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 text-sm">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          Todos ({files.length})
        </button>
        <button
          onClick={() => setFilter('doc')}
          className={`px-4 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1.5 ${filter === 'doc' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          📝 Documentos ({files.filter(f => f.kind === 'doc').length})
        </button>
        <button
          onClick={() => setFilter('sheet')}
          className={`px-4 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1.5 ${filter === 'sheet' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          📊 Planilhas ({files.filter(f => f.kind === 'sheet').length})
        </button>
      </div>

      <div className="dashboard-grid">
        <button onClick={() => handleCreateClick('doc')} className="action-card group">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
             <Icons.Doc />
          </div>
          <span className="action-card-text">Novo Documento</span>
        </button>

        <button onClick={() => handleCreateClick('sheet')} className="action-card group">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
             <Icons.Sheet />
          </div>
          <span className="action-card-text">Nova Planilha</span>
        </button>

        <button onClick={() => fileInputRef.current?.click()} className="action-card group">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
             <Icons.Upload />
          </div>
          <span className="action-card-text text-slate-500">Importar arquivo</span>
        </button>

        {visibleFiles.map(file => (
          <div key={file.id} className="doc-card" onClick={() => onOpen(file.id)}>
            <div className={`doc-card-icon ${file.kind === 'sheet' ? 'text-emerald-600' : ''}`}>
              {file.kind === 'sheet' ? <Icons.Sheet /> : <Icons.Doc />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="doc-card-title truncate" title={file.title}>
                {file.title || 'Sem título'}
              </h3>
              <p className="doc-card-date mt-1">
                {file.kind === 'sheet' ? 'Planilha' : 'Documento'} · {formatDate(file.lastModified)}
              </p>
            </div>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(file.id)
              }}
              title="Excluir arquivo"
              aria-label="Excluir arquivo"
            >
              <Icons.Trash />
            </button>
          </div>
        ))}
      </div>

      {visibleFiles.length === 0 && (
        <div className="mt-20 flex flex-col items-center justify-center text-center opacity-50">
           <div className="text-6xl mb-4">{filter === 'sheet' ? '📊' : filter === 'doc' ? '📝' : '📂'}</div>
           <h3 className="text-xl font-bold">
             {filter === 'all' ? 'Nenhum arquivo ainda' : filter === 'doc' ? 'Nenhum documento ainda' : 'Nenhuma planilha ainda'}
           </h3>
           <p className="max-w-xs mt-2">Comece criando um novo arquivo ou importando um existente.</p>
        </div>
      )}
    </div>
    </div>
  )
}
