import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { markdownToHtml, toggleTaskInMarkdown } from '../utils/markdown'
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
 * Markdown com preview lado a lado (toggle Escrever / Dividido / Preview),
 * checkboxes interativos no preview, contador de palavras, atalhos de
 * inserção (data, título, lista, checklist) e auto-save via onChange.
 */
export default function NotesEditor({
  fileId, initialContent, darkMode, readOnly, onChange,
}: NotesEditorProps) {
  const [value, setValue] = useState(initialContent || '')
  const [mode, setMode] = useState<'write' | 'split' | 'preview'>('split')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
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
  const insertBullet = () => insertAtCursor(`- item 1\n- item 2\n- item 3\n`)

  const previewHtml = useMemo(() => {
    try {
      return sanitizeHtml(markdownToHtml(value))
    } catch {
      return value.replace(/</g, '&lt;').replace(/\n/g, '<br>')
    }
  }, [value])

  // Toggle de checkbox no preview → atualiza markdown bruto
  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return
    const target = e.target as HTMLElement
    if (target.tagName !== 'INPUT' || target.getAttribute('type') !== 'checkbox') return
    const idxStr = target.getAttribute('data-task-index')
    if (idxStr == null) return
    const idx = Number(idxStr)
    if (!Number.isFinite(idx)) return
    e.preventDefault()
    setValue(prev => toggleTaskInMarkdown(prev, idx))
  }, [readOnly])

  const wordCount = useMemo(() => (value.match(/\S+/g) || []).length, [value])
  const charCount = value.length

  // Background sutilmente diferente no preview pra deixar claro que NÃO é o editor
  const previewBg = darkMode
    ? 'bg-gradient-to-b from-amber-950/10 via-transparent to-transparent'
    : 'bg-gradient-to-b from-amber-50/40 via-transparent to-transparent'

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
            {mode === 'split' && (
              <div className="px-6 md:px-10 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 select-none">
                Markdown
              </div>
            )}
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              readOnly={readOnly}
              placeholder="Comece sua anotação…  (Markdown suportado)"
              className={`w-full ${mode === 'split' ? 'h-[calc(100%-2rem)]' : 'h-full'} px-6 md:px-10 pb-6 md:pb-10 pt-2 bg-transparent text-base leading-relaxed resize-none outline-none focus:outline-none focus:ring-0 font-mono
                ${darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-700 placeholder-slate-400'}`}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace', fontSize: '0.95rem' }}
            />
          </div>
        )}

        {(mode === 'preview' || mode === 'split') && (
          <div
            ref={previewRef}
            onClick={handlePreviewClick}
            className={`${mode === 'split' ? 'flex-1 min-w-0' : 'flex-1'} overflow-auto ${previewBg}`}
          >
            {mode === 'split' && (
              <div className="px-6 md:px-10 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400 select-none">
                Preview
              </div>
            )}
            <div
              className={`notes-preview prose dark:prose-invert max-w-none px-6 md:px-10 pb-6 md:pb-10 ${mode === 'split' ? 'pt-2' : 'pt-6'} ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
