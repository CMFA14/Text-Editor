import { useEffect } from 'react'
import { DOC_TEMPLATES } from '../templates/docs'
import { SHEET_TEMPLATES } from '../templates/sheets'
import type { FileKind } from '../types'

interface TemplatePickerProps {
  kind: FileKind
  onPick: (name: string, content: string) => void
  onClose: () => void
}

export default function TemplatePicker({ kind, onPick, onClose }: TemplatePickerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const templates = kind === 'doc'
    ? DOC_TEMPLATES.map(t => ({ id: t.id, name: t.name, icon: t.icon, description: t.description, build: () => ({ name: t.name, content: t.content }) }))
    : SHEET_TEMPLATES.map(t => ({ id: t.id, name: t.name, icon: t.icon, description: t.description, build: () => ({ name: t.name, content: JSON.stringify(t.build()) }) }))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolher template"
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {kind === 'doc' ? 'Novo documento a partir de modelo' : 'Nova planilha a partir de modelo'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Escolha um ponto de partida.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500"
            aria-label="Fechar"
          >✕</button>
        </div>

        <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => {
                const { name, content } = t.build()
                onPick(name, content)
              }}
              className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="font-bold text-slate-800 dark:text-slate-100">{t.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
