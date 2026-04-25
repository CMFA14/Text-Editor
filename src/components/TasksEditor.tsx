import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Plus, X, GripVertical, Calendar, Trash2, Check } from 'lucide-react'
import type { TasksDoc, TaskColumn, TaskCard, TaskColumnColor } from '../types'

interface TasksEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  readOnly: boolean
  onChange: (value: string) => void
}

const DEFAULT_DOC: TasksDoc = {
  version: 1,
  columns: [
    { id: 'todo',  title: 'A fazer',      color: 'amber',   cards: [] },
    { id: 'doing', title: 'Em progresso', color: 'blue',    cards: [] },
    { id: 'done',  title: 'Concluído',    color: 'emerald', cards: [] },
  ],
}

function parseDoc(raw: string): TasksDoc {
  if (!raw) return cloneDoc(DEFAULT_DOC)
  try {
    const parsed = JSON.parse(raw) as Partial<TasksDoc>
    if (parsed && Array.isArray(parsed.columns)) {
      return {
        version: 1,
        columns: parsed.columns.map((c, i): TaskColumn => ({
          id: c.id || `col-${i}`,
          title: c.title || 'Coluna',
          color: (c.color || 'slate') as TaskColumnColor,
          cards: Array.isArray(c.cards) ? c.cards.map((card, j): TaskCard => ({
            id: card.id || `card-${i}-${j}`,
            text: card.text || '',
            notes: card.notes,
            due: card.due,
            createdAt: card.createdAt || Date.now(),
          })) : [],
        })),
      }
    }
  } catch { /* ignore */ }
  return cloneDoc(DEFAULT_DOC)
}

function cloneDoc(d: TasksDoc): TasksDoc {
  return JSON.parse(JSON.stringify(d)) as TasksDoc
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

const COLOR_MAP: Record<TaskColumnColor, { dot: string; ring: string; bg: string; tint: string }> = {
  amber:   { dot: 'bg-amber-500',   ring: 'ring-amber-300/50',   bg: 'bg-amber-50/40 dark:bg-amber-500/10',   tint: 'text-amber-600 dark:text-amber-300' },
  blue:    { dot: 'bg-blue-500',    ring: 'ring-blue-300/50',    bg: 'bg-blue-50/40 dark:bg-blue-500/10',     tint: 'text-blue-600 dark:text-blue-300' },
  emerald: { dot: 'bg-emerald-500', ring: 'ring-emerald-300/50', bg: 'bg-emerald-50/40 dark:bg-emerald-500/10', tint: 'text-emerald-600 dark:text-emerald-300' },
  rose:    { dot: 'bg-rose-500',    ring: 'ring-rose-300/50',    bg: 'bg-rose-50/40 dark:bg-rose-500/10',     tint: 'text-rose-600 dark:text-rose-300' },
  violet:  { dot: 'bg-violet-500',  ring: 'ring-violet-300/50',  bg: 'bg-violet-50/40 dark:bg-violet-500/10', tint: 'text-violet-600 dark:text-violet-300' },
  slate:   { dot: 'bg-slate-400',   ring: 'ring-slate-300/50',   bg: 'bg-slate-50/40 dark:bg-slate-500/10',   tint: 'text-slate-600 dark:text-slate-300' },
}

const COLOR_OPTIONS: TaskColumnColor[] = ['amber', 'blue', 'emerald', 'rose', 'violet', 'slate']

export default function TasksEditor({
  fileId, initialContent, readOnly, onChange,
}: TasksEditorProps) {
  const [doc, setDoc] = useState<TasksDoc>(() => parseDoc(initialContent))
  const [newCardCol, setNewCardCol] = useState<string | null>(null)
  const [newCardText, setNewCardText] = useState('')
  const [editingColId, setEditingColId] = useState<string | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Recarrega ao trocar de arquivo
  useEffect(() => {
    setDoc(parseDoc(initialContent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId])

  // Persiste
  useEffect(() => { onChangeRef.current(JSON.stringify(doc)) }, [doc])

  // ── Mutations ────────────────────────────────────
  const addCard = useCallback((colId: string, text: string) => {
    const txt = text.trim()
    if (!txt) return
    setDoc(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === colId
        ? { ...c, cards: [...c.cards, { id: uuid(), text: txt, createdAt: Date.now() }] }
        : c
      ),
    }))
  }, [])

  const removeCard = useCallback((colId: string, cardId: string) => {
    setDoc(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === colId ? { ...c, cards: c.cards.filter(x => x.id !== cardId) } : c),
    }))
  }, [])

  const updateCard = useCallback((colId: string, cardId: string, patch: Partial<TaskCard>) => {
    setDoc(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === colId
        ? { ...c, cards: c.cards.map(x => x.id === cardId ? { ...x, ...patch } : x) }
        : c
      ),
    }))
  }, [])

  const moveCard = useCallback((cardId: string, fromCol: string, toCol: string, toIndex: number) => {
    setDoc(prev => {
      const cols = prev.columns.map(c => ({ ...c, cards: [...c.cards] }))
      const src = cols.find(c => c.id === fromCol)
      const dst = cols.find(c => c.id === toCol)
      if (!src || !dst) return prev
      const idx = src.cards.findIndex(c => c.id === cardId)
      if (idx < 0) return prev
      const [card] = src.cards.splice(idx, 1)
      const insertAt = Math.max(0, Math.min(toIndex, dst.cards.length))
      dst.cards.splice(insertAt, 0, card)
      return { ...prev, columns: cols }
    })
  }, [])

  const addColumn = useCallback(() => {
    setDoc(prev => ({
      ...prev,
      columns: [...prev.columns, { id: uuid(), title: 'Nova coluna', color: 'slate', cards: [] }],
    }))
  }, [])

  const removeColumn = useCallback((colId: string) => {
    setDoc(prev => ({ ...prev, columns: prev.columns.filter(c => c.id !== colId) }))
  }, [])

  const updateColumn = useCallback((colId: string, patch: Partial<TaskColumn>) => {
    setDoc(prev => ({ ...prev, columns: prev.columns.map(c => c.id === colId ? { ...c, ...patch } : c) }))
  }, [])

  // Estatísticas
  const stats = useMemo(() => {
    const totalCards = doc.columns.reduce((s, c) => s + c.cards.length, 0)
    const doneCol = doc.columns.find(c => c.color === 'emerald') || doc.columns[doc.columns.length - 1]
    const done = doneCol?.cards.length ?? 0
    return { totalCards, done, percent: totalCards ? Math.round((done / totalCards) * 100) : 0 }
  }, [doc])

  // ── Drag & drop ──────────────────────────────────
  const dragRef = useRef<{ cardId: string; fromCol: string } | null>(null)
  const onCardDragStart = (e: React.DragEvent, cardId: string, fromCol: string) => {
    if (readOnly) return
    dragRef.current = { cardId, fromCol }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', cardId)
  }
  const onCardDragEnd = () => { dragRef.current = null }

  const onColumnDragOver = (e: React.DragEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onColumnDrop = (e: React.DragEvent, toCol: string, toIndex?: number) => {
    if (readOnly) return
    e.preventDefault()
    const drag = dragRef.current
    if (!drag) return
    const targetIdx = toIndex == null
      ? doc.columns.find(c => c.id === toCol)?.cards.length ?? 0
      : toIndex
    moveCard(drag.cardId, drag.fromCol, toCol, targetIdx)
    dragRef.current = null
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-ui)] border-b border-[var(--border-light)] text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Quadro Kanban
          </span>
        </div>
        <div className="w-px h-5 bg-[var(--border-light)]" />
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
          {stats.totalCards} {stats.totalCards === 1 ? 'tarefa' : 'tarefas'}
          {stats.totalCards > 0 && <> · <span className="text-emerald-600 dark:text-emerald-400">{stats.percent}% concluído</span></>}
        </div>
        <div className="flex-1" />
        <button
          onClick={addColumn}
          disabled={readOnly}
          className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          title="Adicionar nova coluna"
        >
          <Plus size={14} /> Nova coluna
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex items-stretch gap-4 px-6 py-6 min-w-max">
          {doc.columns.map(col => {
            const palette = COLOR_MAP[col.color] || COLOR_MAP.slate
            return (
            <div
              key={col.id}
              className={`w-72 shrink-0 flex flex-col rounded-2xl border border-[var(--border-light)] ${palette.bg}`}
              onDragOver={onColumnDragOver}
              onDrop={(e) => onColumnDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 flex items-center gap-2 border-b border-[var(--border-light)]">
                <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
                {editingColId === col.id ? (
                  <input
                    autoFocus
                    value={col.title}
                    onChange={e => updateColumn(col.id, { title: e.target.value })}
                    onBlur={() => setEditingColId(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingColId(null) }}
                    className="flex-1 bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 outline-none border-b border-dashed border-slate-400/40 px-1"
                    readOnly={readOnly}
                  />
                ) : (
                  <button
                    onClick={() => !readOnly && setEditingColId(col.id)}
                    className={`flex-1 text-left text-sm font-bold ${palette.tint} hover:opacity-80 transition-opacity truncate`}
                    title="Clique para renomear"
                  >
                    {col.title}
                  </button>
                )}
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-slate-900/40">
                  {col.cards.length}
                </span>
                <ColorMenu
                  current={col.color}
                  disabled={readOnly}
                  onPick={(c) => updateColumn(col.id, { color: c })}
                />
                {!readOnly && doc.columns.length > 1 && (
                  <button
                    onClick={() => {
                      if (col.cards.length > 0 && !confirm(`Remover a coluna "${col.title}" e suas ${col.cards.length} tarefa(s)?`)) return
                      removeColumn(col.id)
                    }}
                    className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors"
                    title="Remover coluna"
                    aria-label="Remover coluna"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-[120px]">
                {col.cards.map((card, idx) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    palette={palette}
                    readOnly={readOnly}
                    onChangeText={(text) => updateCard(col.id, card.id, { text })}
                    onChangeDue={(due) => updateCard(col.id, card.id, { due })}
                    onRemove={() => removeCard(col.id, card.id)}
                    onDragStart={(e) => onCardDragStart(e, card.id, col.id)}
                    onDragEnd={onCardDragEnd}
                    onDropOnCard={(e) => onColumnDrop(e, col.id, idx)}
                  />
                ))}
                {col.cards.length === 0 && (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-4 select-none">
                    Sem tarefas — solte cards aqui
                  </div>
                )}
              </div>

              {/* Add card */}
              <div className="p-2 border-t border-[var(--border-light)]">
                {newCardCol === col.id ? (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      autoFocus
                      value={newCardText}
                      onChange={e => setNewCardText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          addCard(col.id, newCardText)
                          setNewCardText('')
                          setNewCardCol(null)
                        } else if (e.key === 'Escape') {
                          setNewCardCol(null); setNewCardText('')
                        }
                      }}
                      placeholder="Descreva a tarefa…  (Enter para adicionar)"
                      rows={2}
                      className="w-full text-sm rounded-lg border border-[var(--border-light)] bg-white dark:bg-slate-900 px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { addCard(col.id, newCardText); setNewCardText(''); setNewCardCol(null) }}
                        className="px-3 py-1 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => { setNewCardCol(null); setNewCardText('') }}
                        className="px-2 py-1 text-xs font-bold rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewCardCol(col.id)}
                    disabled={readOnly}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Plus size={14} /> Adicionar tarefa
                  </button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ColorMenu({
  current, onPick, disabled,
}: { current: TaskColumnColor; onPick: (c: TaskColumnColor) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t?.closest('[data-color-menu]')) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div data-color-menu className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`w-4 h-4 rounded-full border-2 border-white shadow ring-2 ${COLOR_MAP[current].dot} ${COLOR_MAP[current].ring} disabled:opacity-40`}
        title="Mudar cor da coluna"
        aria-label="Mudar cor da coluna"
      />
      {open && (
        <div className="absolute right-0 top-6 z-30 bg-[var(--bg-page)] rounded-xl border border-[var(--border-light)] shadow-xl p-2 grid grid-cols-3 gap-1.5">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              onClick={() => { onPick(c); setOpen(false) }}
              className={`w-5 h-5 rounded-full ${COLOR_MAP[c].dot} ${current === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
              aria-label={`Cor ${c}`}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CardItem({
  card, palette, readOnly, onChangeText, onChangeDue, onRemove, onDragStart, onDragEnd, onDropOnCard,
}: {
  card: TaskCard
  palette: { dot: string; ring: string; bg: string; tint: string }
  readOnly: boolean
  onChangeText: (text: string) => void
  onChangeDue: (due: string | undefined) => void
  onRemove: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDropOnCard: (e: React.DragEvent) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(card.text)
  const [showDate, setShowDate] = useState(false)

  useEffect(() => { setText(card.text) }, [card.text])

  const dueDate = card.due ? new Date(card.due) : null
  const overdue = !!dueDate && dueDate.getTime() < Date.now()
  const fmtDue = dueDate
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(dueDate)
    : null

  return (
    <div
      draggable={!readOnly}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { if (!readOnly) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
      onDrop={onDropOnCard}
      className="group bg-white dark:bg-slate-900 rounded-lg border border-[var(--border-light)] p-2.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        {!readOnly && <GripVertical size={14} className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0 group-hover:text-slate-400" />}
        {editing ? (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { onChangeText(text); setEditing(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onChangeText(text); setEditing(false) }
              if (e.key === 'Escape') { setText(card.text); setEditing(false) }
            }}
            rows={2}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none resize-none border-b border-dashed border-slate-300 dark:border-slate-700"
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditing(true)}
            className="flex-1 text-left text-sm text-slate-800 dark:text-slate-100 leading-snug whitespace-pre-wrap break-words"
            title={readOnly ? '' : 'Clique para editar'}
          >
            {card.text || <span className="text-slate-400 italic">Sem descrição</span>}
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        {fmtDue && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${overdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            <Calendar size={10} /> {fmtDue}{overdue && ' · atrasada'}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 ${palette.tint} font-semibold opacity-70`}>
          <Check size={10} />
        </span>
        <div className="flex-1" />
        {!readOnly && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={() => setShowDate(v => !v)}
              className="w-6 h-6 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center"
              title="Definir data"
              aria-label="Definir data"
            >
              <Calendar size={12} />
            </button>
            <button
              onClick={onRemove}
              className="w-6 h-6 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center"
              title="Excluir tarefa"
              aria-label="Excluir tarefa"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {showDate && !readOnly && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={card.due ? card.due.slice(0, 10) : ''}
            onChange={(e) => {
              const v = e.target.value
              onChangeDue(v ? new Date(v).toISOString() : undefined)
            }}
            className="text-xs rounded-md border border-[var(--border-light)] bg-white dark:bg-slate-800 px-2 py-1"
          />
          {card.due && (
            <button
              onClick={() => onChangeDue(undefined)}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-500"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
