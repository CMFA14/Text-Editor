import type { FlimasTool } from './FlimasEditor'
import {
  MousePointer2, Hand, Brush, Eraser, Type, Square, Circle as CircleIcon,
  Triangle, Minus, MoveUpRight, ImagePlus, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize, Download, Trash2,
} from 'lucide-react'

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
  onExport: (format: 'png' | 'jpeg' | 'webp') => void
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

export default function Toolbar(p: ToolbarProps) {
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

      {/* Export dropdown — simples, 3 botões */}
      <div className="relative group">
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-md"
          title="Exportar"
        >
          <Download size={18} />
        </button>
        <div className="absolute left-12 bottom-0 hidden group-hover:block bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 min-w-[120px]">
          {(['png','jpeg','webp'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => p.onExport(fmt)}
              className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 uppercase"
            >
              .{fmt}
            </button>
          ))}
        </div>
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
