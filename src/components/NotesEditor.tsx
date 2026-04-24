import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { markdownToHtml } from '../utils/markdown'
import { sanitizeHtml } from '../utils/sanitize'

interface NotesEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  readOnly: boolean
  onChange: (value: string) => void
}

/**
 * Flimas Notes — editor de anotações rápidas.
 * Suporta Markdown com preview lado a lado, contador de palavras/caracteres,
 * inserção rápida de timestamps e auto-save via onChange.
 */
export default function NotesEditor({
  fileId, initialContent, darkMode, readOnly, onChange,
}: NotesEditorProps) {
  const [value, setValue] = useState(initialContent || '')
  const [mode, setMode] = useState<'write' | 'split' | 'preview'>('write')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Recarrega ao trocar de arquivo
  useEffect(() => {
    setValue(initialContent || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId])

  // Persiste
  useEffect(() => { onChangeRef.current(value) }, [value])

  const insertAtCursor = useCallback((snippet: string) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = value.slice(0, start) + snippet + value.slice(end)
    setValue(next)
    queueMicrotask(() => {
      ta.focus()
      const pos = start + snippet.length
      ta.setSelectionRange(pos, pos)
    })
  }, [value])

  const insertDate = () => {
    const now = new Date()
    const stamp = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full', timeStyle: 'short',
    }).format(now)
    insertAtCursor(`**${stamp}**\n\n`)
  }

  const insertChecklist = () => insertAtCursor(`- [ ] Primeira tarefa\n- [ ] Segunda tarefa\n- [ ] Terceira tarefa\n`)
  const insertHeading = () => insertAtCursor(`\n## Título\n\n`)
  const insertBullet = () => insertAtCursor(`- \n- \n- \n`)

  const previewHtml = useMemo(() => {
    try {
      return sanitizeHtml(markdownToHtml(value))
    } catch {
      return value.replace(/</g, '&lt;').replace(/\n/g, '<br>')
    }
  }, [value])

  const wordCount = useMemo(() => (value.match(/\S+/g) || []).length, [value])
  const charCount = value.length

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-ui)] border-b border-[var(--border-light)] text-sm">
        <div className="flex items-center gap-1 bg-[var(--bg-page)] rounded-lg p-0.5 border border-[var(--border-light)]">
          {(['write', 'split', 'preview'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                mode === m
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-ui-hover)]'
              }`}
              aria-pressed={mode === m}
            >
              {m === 'write' ? 'Escrever' : m === 'split' ? 'Dividido' : 'Preview'}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[var(--border-light)]" />

        <button onClick={insertDate} disabled={readOnly} className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-md hover:bg-[var(--bg-ui-hover)] transition-colors disabled:opacity-40" title="Inserir data/hora">
          📅 Data
        </button>
        <button onClick={insertHeading} disabled={readOnly} className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-md hover:bg-[var(--bg-ui-hover)] transition-colors disabled:opacity-40" title="Inserir título">
          H2
        </button>
        <button onClick={insertBullet} disabled={readOnly} className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-md hover:bg-[var(--bg-ui-hover)] transition-colors disabled:opacity-40" title="Inserir lista">
          • Lista
        </button>
        <button onClick={insertChecklist} disabled={readOnly} className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-md hover:bg-[var(--bg-ui-hover)] transition-colors disabled:opacity-40" title="Inserir checklist">
          ☐ Checklist
        </button>

        <div className="flex-1" />

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {wordCount} palavras · {charCount} caracteres
        </div>
      </div>

      {/* Edit / Preview */}
      <div className="flex-1 min-h-0 flex">
        {(mode === 'write' || mode === 'split') && (
          <div className={mode === 'split' ? 'flex-1 min-w-0 border-r border-[var(--border-light)]' : 'flex-1 min-w-0'}>
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              readOnly={readOnly}
              placeholder="Comece sua anotação…  (Markdown suportado)"
              className={`w-full h-full p-6 md:p-10 bg-transparent text-base leading-relaxed resize-none outline-none focus:outline-none focus:ring-0
                ${darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
            />
          </div>
        )}

        {(mode === 'preview' || mode === 'split') && (
          <div
            className={`${mode === 'split' ? 'flex-1 min-w-0' : 'flex-1'} overflow-auto`}
          >
            <div
              className={`prose dark:prose-invert max-w-none p-6 md:p-10 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
