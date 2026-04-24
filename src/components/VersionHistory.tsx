import { useEffect, useState } from 'react'
import { loadHistory, type Snapshot } from '../history'
import logoDoc from '../assets/logo-doc.svg'
import logoSheet from '../assets/logo-sheet.svg'

interface VersionHistoryProps {
  fileId: string
  onRestore: (snap: Snapshot) => void
  onClose: () => void
}

function formatTs(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

function preview(content: string, kind: Snapshot['kind']): string {
  if (kind === 'sheet') return 'Snapshot de planilha'
  const div = document.createElement('div')
  div.innerHTML = content
  const text = (div.textContent || '').trim()
  return text.length > 120 ? text.slice(0, 120) + '…' : (text || '(vazio)')
}

export default function VersionHistory({ fileId, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Snapshot[]>([])

  useEffect(() => {
    setVersions(loadHistory(fileId))
  }, [fileId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Histórico de versões"
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Histórico de versões
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Últimas {versions.length} versões salvas automaticamente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500"
            aria-label="Fechar"
          >✕</button>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1">
          {versions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-5xl mb-3">🕓</div>
              <p className="font-semibold">Nenhuma versão salva ainda</p>
              <p className="text-sm">Snapshots são criados automaticamente a cada 5 minutos.</p>
            </div>
          )}
          {versions.map((v, i) => (
            <div
              key={v.timestamp}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 transition-colors flex items-start gap-4"
            >
              <img src={v.kind === 'sheet' ? logoSheet : logoDoc} alt="" className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{v.title || 'Sem título'}</span>
                  {i === 0 && (
                    <span className="text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Mais recente
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-2">{formatTs(v.timestamp)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {preview(v.content, v.kind)}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Restaurar esta versão? O conteúdo atual será substituído (mas continuará no histórico).')) {
                    onRestore(v)
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors whitespace-nowrap"
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
