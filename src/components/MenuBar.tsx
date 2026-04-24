import React, { useState, useRef, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import { isSafeUrl } from '../utils/sanitize'

interface MenuBarProps {
  editor: Editor | null
  onToggleFind: () => void
  onExportHTML: () => void
  onExportTXT: () => void
  onExportMD: () => void
  onExportPDF: () => void
  onPrint: () => void
  onNew: () => void
  zoom: number
  onZoomChange: (z: number) => void
}

/* ─── SVG Icons ───────────────────────────────────── */
const Icons = {
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  Underline: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>,
  Strike: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>,
  AlignLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>,
  AlignCenter: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>,
  AlignRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  AlignJustify: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>,
  List: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  ListOrdered: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
  CheckSquare: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Code: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Quote: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 2.5 1 4.066 2 5V21zm9 0c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 2.5 1 4.066 2 5V21z"/></svg>,
  Link: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Table: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Printer: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  File: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
}

const FONT_FAMILIES = [
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Playfair Display', value: 'Playfair Display, serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]

const HEADINGS: { label: string; level?: number }[] = [
  { label: 'Parágrafo' },
  { label: 'Título 1', level: 1 },
  { label: 'Título 2', level: 2 },
  { label: 'Título 3', level: 3 },
  { label: 'Título 4', level: 4 },
  { label: 'Título 5', level: 5 },
  { label: 'Título 6', level: 6 },
]

const COLORS = [
  '#000000','#1e293b','#334155','#475569','#64748b',
  '#ef4444','#f97316','#f59e0b','#10b981','#06b6d4',
  '#3b82f6','#6366f1','#8b5cf6','#d946ef','#ec4899',
  '#f1f5f9','#ffffff'
]

const HIGHLIGHT_COLORS = [
  { label: 'Amarelo', color: '#fef08a' },
  { label: 'Verde', color: '#bbf7d0' },
  { label: 'Azul', color: '#bfdbfe' },
  { label: 'Rosa', color: '#fbcfe8' },
  { label: 'Laranja', color: '#fed7aa' },
  { label: 'Roxo', color: '#e9d5ff' },
]

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="tooltip-wrap relative inline-flex">
      {children}
      <span className="tooltip-text absolute bottom-full left-1/2 -translate-x-1/2 mb-2">
        {text}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
}

function ToolbarBtn({
  onClick, active, title, disabled, children
}: {
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip text={title}>
      <button
        onMouseDown={e => { e.preventDefault(); onClick() }}
        disabled={disabled}
        className={`toolbar-btn ${active ? 'active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export default function MenuBar({
  editor,
  onToggleFind, onExportHTML, onExportTXT, onExportMD, onExportPDF, onPrint, onNew,
  zoom, onZoomChange
}: MenuBarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showTableMenu, setShowTableMenu] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [showInsertMenu, setShowInsertMenu] = useState(false)
  const [showViewMenu, setShowViewMenu] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState('Merriweather, serif')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync font size with selection
  useEffect(() => {
    if (!editor) return
    const attrs = editor.getAttributes('textStyle')
    if (attrs.fontSize) {
      const sizeStr = attrs.fontSize.replace('px', '')
      const sizeNum = parseInt(sizeStr, 10)
      if (!isNaN(sizeNum)) setFontSize(sizeNum)
    }
  }, [editor?.state.selection])

  if (!editor) return null

  const currentHeading = () => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) return `Título ${i}`
    }
    return 'Parágrafo'
  }

  const setHeading = (level?: number) => {
    if (!level) editor.chain().focus().setParagraph().run()
    else editor.chain().focus().toggleHeading({ level: level as 1|2|3|4|5|6 }).run()
  }

  const applyLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run()
    } else if (!isSafeUrl(linkUrl)) {
      alert('URL inválida. Use http://, https:// ou mailto:')
      return
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim(), target: '_blank' }).run()
    }
    setShowLinkModal(false)
    setLinkUrl('')
  }

  const applyImage = () => {
    if (!imageUrl) return
    if (!isSafeUrl(imageUrl)) {
      alert('URL de imagem inválida. Use http:// ou https://')
      return
    }
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
    setShowImageModal(false)
    setImageUrl('')
  }

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      editor.chain().focus().setImage({ src }).run()
    }
    reader.readAsDataURL(file)
  }

  const applyFontSize = (size: number) => {
    if (isNaN(size)) return
    setFontSize(size)
    // Use the registered fontSize attribute via textStyle
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run()
  }

  const applyFontFamily = (family: string) => {
    setFontFamily(family)
    editor.chain().focus().setFontFamily(family).run()
  }

  const closeAll = () => {
    setShowFileMenu(false)
    setShowInsertMenu(false)
    setShowViewMenu(false)
    setShowColorPicker(false)
    setShowHighlightPicker(false)
    setShowTableMenu(false)
  }

  return (
    <div className="flex flex-col glass-panel border-b border-white select-none sticky top-16 z-50" onClick={closeAll}>

      {/* ── Menu Bar Top ───────────────────────────── */}
      <div className="flex items-center gap-1 px-2 md:px-4 py-1.5 border-b border-white/20 text-sm font-medium overflow-x-auto scrollbar-thin">
        {/* File menu */}
        <div className="relative">
          <button
            className="px-3 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setShowFileMenu(v => !v); setShowInsertMenu(false); setShowViewMenu(false) }}
          >Arquivo <Icons.ChevronDown /></button>
          {showFileMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 dropdown-menu" onClick={e => e.stopPropagation()}>
              <MenuItem label="Novo documento" shortcut="Ctrl+N" onClick={() => { onNew(); closeAll() }} />
              <MenuItem label="Imprimir" shortcut="Ctrl+P" onClick={() => { onPrint(); closeAll() }} />
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />
              <MenuItem label="Exportar como PDF" onClick={() => { onExportPDF(); closeAll() }} />
              <MenuItem label="Exportar como HTML" onClick={() => { onExportHTML(); closeAll() }} />
              <MenuItem label="Exportar como TXT" onClick={() => { onExportTXT(); closeAll() }} />
              <MenuItem label="Exportar como Markdown" onClick={() => { onExportMD(); closeAll() }} />
            </div>
          )}
        </div>

        {/* Insert menu */}
        <div className="relative">
          <button
            className="px-3 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setShowInsertMenu(v => !v); setShowFileMenu(false); setShowViewMenu(false) }}
          >Inserir <Icons.ChevronDown /></button>
          {showInsertMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 dropdown-menu" onClick={e => e.stopPropagation()}>
              <MenuItem label="Link" shortcut="Ctrl+K" onClick={() => { setShowLinkModal(true); closeAll() }} />
              <MenuItem label="Imagem por URL" onClick={() => { setShowImageModal(true); closeAll() }} />
              <MenuItem label="Imagem local" onClick={() => { fileInputRef.current?.click(); closeAll() }} />
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />
              <MenuItem label="Tabela" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(); closeAll() }} />
              <MenuItem label="Linha horizontal" onClick={() => { editor.chain().focus().setHorizontalRule().run(); closeAll() }} />
              <MenuItem label="Citação" onClick={() => { editor.chain().focus().toggleBlockquote().run(); closeAll() }} />
              <MenuItem label="Lista de tarefas" onClick={() => { editor.chain().focus().toggleTaskList().run(); closeAll() }} />
            </div>
          )}
        </div>

        {/* View menu */}
        <div className="relative">
          <button
            className="px-3 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setShowViewMenu(v => !v); setShowFileMenu(false); setShowInsertMenu(false) }}
          >Visualizar <Icons.ChevronDown /></button>
          {showViewMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 dropdown-menu" onClick={e => e.stopPropagation()}>
              <MenuItem label="Localizar e Substituir" shortcut="Ctrl+H" onClick={() => { onToggleFind(); closeAll() }} />
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />
              <MenuItem label="Aumentar zoom" onClick={() => { onZoomChange(Math.min(zoom + 10, 200)); closeAll() }} />
              <MenuItem label="Diminuir zoom" onClick={() => { onZoomChange(Math.max(zoom - 10, 50)); closeAll() }} />
              <MenuItem label="Zoom 100%" onClick={() => { onZoomChange(100); closeAll() }} />
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-[var(--bg-ui)] rounded-lg px-2 py-0.5 border border-slate-200 dark:border-slate-700">
           <button onClick={() => onZoomChange(Math.max(zoom-10, 50))} className="p-1 hover:text-indigo-500 transition-colors" aria-label="Diminuir zoom" title="Diminuir zoom"><Icons.Minus /></button>
           <span className="text-xs w-10 text-center font-bold" aria-live="polite">{zoom}%</span>
           <button onClick={() => onZoomChange(Math.min(zoom+10, 200))} className="p-1 hover:text-indigo-500 transition-colors" aria-label="Aumentar zoom" title="Aumentar zoom"><Icons.Plus /></button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 px-2 md:px-4 py-2 border-b border-white/10">

        {/* History */}
        <div className="flex gap-0.5">
          <ToolbarBtn title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Icons.Undo /></ToolbarBtn>
          <ToolbarBtn title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Icons.Redo /></ToolbarBtn>
        </div>

        <Divider />

        {/* Text Style Dropdowns */}
        <select
          value={currentHeading()}
          onChange={e => {
            const found = HEADINGS.find(h => h.label === e.target.value)
            setHeading(found?.level)
          }}
          className="h-9 px-3 text-xs font-semibold border-none rounded-lg bg-[var(--bg-ui)] text-[var(--text-select)] focus:ring-2 ring-indigo-500 cursor-pointer min-w-[120px]"
        >
          {HEADINGS.map(h => <option key={h.label} value={h.label}>{h.label}</option>)}
        </select>

        <select
          value={fontFamily}
          onChange={e => applyFontFamily(e.target.value)}
          className="h-9 px-3 text-xs font-semibold border-none rounded-lg bg-[var(--bg-ui)] text-[var(--text-select)] focus:ring-2 ring-indigo-500 cursor-pointer min-w-[150px]"
        >
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <div className="flex items-center bg-[var(--bg-ui)] rounded-lg h-9 overflow-hidden">
          <button onMouseDown={e => {e.preventDefault(); applyFontSize(Math.max(fontSize-1, 8))}} className="px-2 h-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Icons.Minus /></button>
          <input
            type="number"
            min={8}
            max={72}
            step={1}
            value={fontSize}
            onChange={e => {
              const parsed = parseInt(e.target.value, 10)
              if (Number.isFinite(parsed)) applyFontSize(Math.min(Math.max(parsed, 8), 72))
            }}
            aria-label="Tamanho da fonte"
            className="w-10 h-full bg-transparent text-center border-none text-xs font-bold focus:ring-0 appearance-none"
          />
          <button onMouseDown={e => {e.preventDefault(); applyFontSize(Math.min(fontSize+1, 72))}} className="px-2 h-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Icons.Plus /></button>
        </div>

        <Divider />

        {/* Basic Formatting */}
        <div className="flex gap-0.5">
          <ToolbarBtn title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Icons.Bold /></ToolbarBtn>
          <ToolbarBtn title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Icons.Italic /></ToolbarBtn>
          <ToolbarBtn title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Icons.Underline /></ToolbarBtn>
          <ToolbarBtn title="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Icons.Strike /></ToolbarBtn>
        </div>

        <Divider />

        {/* Colors */}
        <div className="flex gap-1 items-center relative" onClick={e => e.stopPropagation()}>
          <Tooltip text="Cor do Texto">
            <button
              onMouseDown={e => {e.preventDefault(); setShowColorPicker(!showColorPicker); setShowHighlightPicker(false)}}
              className="w-10 h-9 flex flex-col items-center justify-center rounded-lg bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] transition-colors border border-slate-200 dark:border-slate-700"
            >
              <span className="font-bold text-xs">A</span>
              <div className="w-6 h-1 mt-0.5 rounded-full" style={{ background: editor.getAttributes('textStyle').color || 'currentColor' }} />
            </button>
          </Tooltip>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-2 p-3 dropdown-menu w-52 grid grid-cols-5 gap-1.5 animate-in fade-in zoom-in duration-200">
              {COLORS.map(c => (
                <button
                  key={c}
                  onMouseDown={e => {e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowColorPicker(false)}}
                  className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-800 shadow-sm transition-transform hover:scale-110"
                  style={{ background: c }}
                />
              ))}
            </div>
          )}

          <Tooltip text="Destaque">
            <button
               onMouseDown={e => {e.preventDefault(); setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false)}}
               className={`w-10 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-ui)] transition-colors border border-slate-200 dark:border-slate-700 ${editor.isActive('highlight') ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-[var(--bg-ui-hover)]'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15.477 12.89 1.515 1.515a2 2 0 0 1 0 2.828l-2.434 2.434a2 2 0 0 1-2.828 0l-1.515-1.515L15.477 12.89z"/><path d="M13.434 3.434a2 2 0 0 1 2.828 0l2.434 2.434a2 2 0 0 1 0 2.828l-5.32 5.32-5.26-5.26 5.318-5.322z"/><path d="M2 22s5-4.5 7-5l-2-2-5 7z"/></svg>
            </button>
          </Tooltip>

          {showHighlightPicker && (
            <div className="absolute top-full left-10 mt-2 p-3 dropdown-menu w-44 grid grid-cols-3 gap-2">
              {HIGHLIGHT_COLORS.map(h => (
                <button
                   key={h.color}
                   onMouseDown={e => {e.preventDefault(); editor.chain().focus().toggleHighlight({ color: h.color }).run(); setShowHighlightPicker(false)}}
                   className="w-10 h-10 rounded-lg shadow-sm transition-transform hover:scale-110"
                   style={{ background: h.color }}
                />
              ))}
              <button onMouseDown={e => {e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false)}} className="col-span-3 text-[10px] font-bold py-1 bg-slate-100 dark:bg-slate-800 rounded-md">REMOVER DESTAQUE</button>
            </div>
          )}
        </div>

        <Divider />

        {/* Alignment - Standard "Lines" Icons */}
        <div className="flex gap-0.5">
          <ToolbarBtn title="Esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><Icons.AlignLeft /></ToolbarBtn>
          <ToolbarBtn title="Centro" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><Icons.AlignCenter /></ToolbarBtn>
          <ToolbarBtn title="Direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><Icons.AlignRight /></ToolbarBtn>
          <ToolbarBtn title="Justificar" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><Icons.AlignJustify /></ToolbarBtn>
        </div>

        <Divider />

        {/* Lists & Objects */}
        <div className="flex gap-0.5">
          <ToolbarBtn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><Icons.List /></ToolbarBtn>
          <ToolbarBtn title="Ordered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><Icons.ListOrdered /></ToolbarBtn>
          <ToolbarBtn title="Task List" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><Icons.CheckSquare /></ToolbarBtn>
        </div>

        <Divider />

        <div className="flex gap-0.5">
          <ToolbarBtn title="Inserir Link" active={editor.isActive('link')} onClick={() => setShowLinkModal(true)}><Icons.Link /></ToolbarBtn>
          <ToolbarBtn title="Inserir Imagem" onClick={() => setShowImageModal(true)}><Icons.Image /></ToolbarBtn>
          <ToolbarBtn title="Tabela" onClick={() => setShowTableMenu(!showTableMenu)}><Icons.Table /></ToolbarBtn>
        </div>

        <div className="flex-1" />

        <ToolbarBtn title="Localizar & Substituir" onClick={onToggleFind}><Icons.Search /></ToolbarBtn>
        <ToolbarBtn title="Imprimir" onClick={onPrint}><Icons.Printer /></ToolbarBtn>
      </div>

      {/* ── Link Modal ─────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-[400px] border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-500"><Icons.Link /> Inserir Link</h3>
            <div className="space-y-4">
              <input
                type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://exemplo.com" autoFocus
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-indigo-500 font-medium transition-all"
              />
              <div className="flex gap-3">
                <button onClick={applyLink} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">Confirmar</button>
                <button onClick={() => {editor.chain().focus().unsetLink().run(); setShowLinkModal(false)}} className="px-4 text-xs font-bold text-red-500 hover:underline">Remover</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Modal ────────────────────────────── */}
      {showImageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowImageModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-[400px] border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-500"><Icons.Image /> Inserir Imagem</h3>
            <div className="space-y-5">
              <div>
                 <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Pela URL</p>
                 <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-indigo-500 font-medium transition-all" />
              </div>

              <div className="relative">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Do Computador</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-8 cursor-pointer hover:bg-indigo-50 transition-colors group">
                   <Icons.File />
                   <span className="text-sm font-bold mt-2 text-slate-400 group-hover:text-indigo-500 font-inter">Escolher arquivo</span>
                   <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={e => {handleImageFile(e); setShowImageModal(false)}} />
                </label>
              </div>

              <div className="flex gap-3">
                 <button onClick={applyImage} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">Inserir URL</button>
                 <button onClick={() => setShowImageModal(false)} className="px-6 text-sm font-bold text-slate-400 hover:text-indigo-500">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function MenuItem({ label, shortcut, onClick }: { label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button onMouseDown={e => { e.preventDefault(); onClick() }} className="menu-item w-full">
      <span className="flex-1 font-semibold text-sm">{label}</span>
      {shortcut && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-inner">{shortcut}</span>}
    </button>
  )
}
