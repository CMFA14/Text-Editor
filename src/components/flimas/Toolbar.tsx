import { useState, useRef, useEffect } from 'react'
import type { FlimasTool } from './FlimasEditor'
import {
  MousePointer2, Hand, Brush, Eraser, Type, Square, Circle as CircleIcon,
  Triangle, Minus, MoveUpRight, ImagePlus, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize, Download, Trash2, ChevronRight,
} from 'lucide-react'

type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf'

interface ToolbarProps {
  activeTool: FlimasTool
  setActiveTool: (t: FlimasTool) => void
  onImportImage: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onZoomReset: () => void
  zoomPercent: number
  onExport: (format: ExportFormat) => void
  onClear: () => void
}

interface ToolBtn { id: FlimasTool; icon: React.ReactNode; tip: string }

const TOOLS: ToolBtn[] = [
  { id: 'select',   icon: <MousePointer2 size={18} />, tip: 'Selecionar (V)' },
  { id: 'pan',      icon: <Hand size={18} />,          tip: 'Mão / Pan (H — ou segure Alt)' },
  { id: 'brush',    icon: <Brush size={18} />,         tip: 'Pincel (B)' },
  { id: 'eraser',   icon: <Eraser size={18} />,        tip: 'Borracha (E)' },
  { id: 'text',     icon: <Type size={18} />,          tip: 'Texto (T)' },
]

const SHAPES: ToolBtn[] = [
  { id: 'rect',     icon: <Square size={18} />,       tip: 'Retângulo (R)' },
  { id: 'circle',   icon: <CircleIcon size={18} />,   tip: 'Elipse (O)' },
  { id: 'triangle', icon: <Triangle size={18} />,     tip: 'Triângulo' },
  { id: 'line',     icon: <Minus size={18} />,        tip: 'Linha' },
  { id: 'arrow',    icon: <MoveUpRight size={18} />,  tip: 'Seta' },
]

const EXPORT_OPTIONS: { fmt: ExportFormat; label: string; hint: string }[] = [
  { fmt: 'png',  label: 'PNG',  hint: 'Alta qualidade · transparência' },
  { fmt: 'jpeg', label: 'JPEG', hint: 'Compacto · sem transparência' },
  { fmt: 'webp', label: 'WebP', hint: 'Moderno · web' },
  { fmt: 'svg',  label: 'SVG',  hint: 'Vetorial · escalável' },
  { fmt: 'pdf',  label: 'PDF',  hint: 'Documento imprimível' },
]

export default function Toolbar(p: ToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!exportRef.current) return
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExportOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  const toolBtn = (t: ToolBtn) => (
    <button
      key={t.id}
      onClick={() => p.setActiveTool(t.id)}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        p.activeTool === t.id
          ? 'bg-pink-500 text-white shadow-md shadow-pink-200 dark:shadow-none'
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      title={t.tip}
      aria-pressed={p.activeTool === t.id}
    >
      {t.icon}
    </button>
  )

  return (
    <div className="w-14 flex flex-col items-center py-3 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 gap-1.5 shrink-0 z-10">
      {TOOLS.map(toolBtn)}

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2" />
      {SHAPES.map(toolBtn)}

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2" />

      <button
        onClick={p.onImportImage}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Inserir imagem"
      >
        <ImagePlus size={18} />
      </button>

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2" />

      <button onClick={p.onUndo} disabled={!p.canUndo}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Desfazer (Ctrl+Z)">
        <Undo2 size={18} />
      </button>
      <button onClick={p.onRedo} disabled={!p.canRedo}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Refazer (Ctrl+Y / Ctrl+Shift+Z)">
        <Redo2 size={18} />
      </button>

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2" />

      <button onClick={p.onZoomIn}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Aumentar zoom">
        <ZoomIn size={18} />
      </button>
      <button onClick={p.onZoomOut}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Diminuir zoom">
        <ZoomOut size={18} />
      </button>
      <button onClick={p.onZoomFit}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Ajustar à tela">
        <Maximize size={18} />
      </button>
      <button onClick={p.onZoomReset}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Zoom 100%">
        {p.zoomPercent}%
      </button>

      <div className="flex-1" />

      {/* Salvar como — menu click-to-open */}
      <div ref={exportRef} className="relative">
        <button
          onClick={() => setExportOpen(v => !v)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-md"
          title="Salvar como…"
          aria-haspopup="menu"
          aria-expanded={exportOpen}
        >
          <Download size={18} />
        </button>
        {exportOpen && (
          <div
            role="menu"
            className="absolute left-12 bottom-0 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-30 min-w-[220px] text-slate-700 dark:text-slate-100"
          >
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Salvar como
            </div>
            {EXPORT_OPTIONS.map(opt => (
              <button
                key={opt.fmt}
                role="menuitem"
                onClick={() => { setExportOpen(false); p.onExport(opt.fmt) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-pink-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="font-bold w-12 text-pink-600 dark:text-pink-400">.{opt.fmt}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex-1 text-left truncate">{opt.hint}</span>
                <ChevronRight size={12} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={p.onClear}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        title="Limpar canvas"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
