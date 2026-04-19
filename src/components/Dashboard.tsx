import React, { useRef } from 'react'
import { DocEntry } from '../App'

interface DashboardProps {
  documents: DocEntry[]
  onOpen: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onImport: (file: File) => void
  darkMode: boolean
  onToggleTheme: () => void
}

const Icons = {
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  File: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
}

export default function Dashboard({
  documents, onOpen, onCreate, onDelete, onImport, darkMode, onToggleTheme
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
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

  return (
    <div className="min-h-screen bg-[var(--bg-app)] transition-colors duration-500">
      {/* Mini Header for Dashboard */}
      <header className="glass-panel sticky top-0 z-[60] flex items-center justify-between px-8 py-4 border-b border-white/10 select-none shadow-sm mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <span className="text-xl text-white">📝</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight leading-none bg-clip-text text-transparent" style={{ backgroundImage: 'var(--logo-gradient)' }}>Editor Pro</span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Meus Documentos</span>
          </div>
        </div>

        <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] flex items-center justify-center transition-all group overflow-hidden relative border border-slate-200 dark:border-slate-700"
        >
            <div className={`transition-transform duration-500 ${darkMode ? 'translate-y-12' : 'translate-y-0'}`}>🌙</div>
            <div className={`absolute transition-transform duration-500 ${darkMode ? 'translate-y-0' : '-translate-y-12'}`}>☀️</div>
        </button>
      </header>

      <div className="dashboard-container !py-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Meus Documentos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Gerencie, crie e importe seus arquivos com facilidade.
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
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Icons.Plus />
              Novo Documento
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".html,.md,.txt"
              onChange={handleFileChange}
            />
        </div>
      </div>

      <div className="dashboard-grid">
        {/* New Doc Action Card */}
        <button onClick={onCreate} className="action-card group">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
             <Icons.Plus />
          </div>
          <span className="action-card-text">Criar do zero</span>
        </button>

        {/* Import Action Card */}
        <button onClick={() => fileInputRef.current?.click()} className="action-card group">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
             <Icons.Upload />
          </div>
          <span className="action-card-text text-slate-500">Importar arquivo</span>
        </button>

        {/* Existing Documents */}
        {documents.sort((a, b) => b.lastModified - a.lastModified).map(doc => (
          <div key={doc.id} className="doc-card" onClick={() => onOpen(doc.id)}>
            <div className="doc-card-icon">
              <Icons.File />
            </div>
            <div className="flex-1">
              <h3 className="doc-card-title truncate" title={doc.title}>
                {doc.title || 'Sem título'}
              </h3>
              <p className="doc-card-date mt-1">
                {formatDate(doc.lastModified)}
              </p>
            </div>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(doc.id)
              }}
              title="Excluir documento"
            >
              <Icons.Trash />
            </button>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="mt-20 flex flex-col items-center justify-center text-center opacity-50">
           <div className="text-6xl mb-4">📂</div>
           <h3 className="text-xl font-bold">Nenhum documento ainda</h3>
           <p className="max-w-xs mt-2">Comece criando um novo documento ou importando um arquivo existente.</p>
        </div>
      )}
    </div>
    </div>
  )
}
