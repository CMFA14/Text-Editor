import React from 'react'
import { FlimasTool } from './FlimasEditor'
import { MousePointer2, Type, Crop, ImagePlus, Eraser, Trash2, Wand2, Brush, Square, Circle, Undo2, Redo2 } from 'lucide-react'

interface ToolbarProps {
  activeTool: FlimasTool
  setActiveTool: (t: FlimasTool) => void
  onClear: () => void
  onBgRemove: () => void
  onImageRequest: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export default function Toolbar({ 
  activeTool, setActiveTool, onClear, onBgRemove, onImageRequest,
  onUndo, onRedo, canUndo, canRedo
}: ToolbarProps) {
  const tools: { id: FlimasTool; icon: React.ReactNode; tooltip: string }[] = [
    { id: 'select', icon: <MousePointer2 size={20} />, tooltip: 'Selecionar (V)' },
    { id: 'brush', icon: <Brush size={20} />, tooltip: 'Pincel Livre (B)' },
    { id: 'text', icon: <Type size={20} />, tooltip: 'Texto (T)' },
    { id: 'rect', icon: <Square size={20} />, tooltip: 'Retângulo' },
    { id: 'circle', icon: <Circle size={20} />, tooltip: 'Círculo' },
  ]

  return (
    <div className="w-16 flex flex-col items-center py-4 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 gap-4 shrink-0 z-10 shadow-sm">
      <div className="text-pink-500 font-bold text-xs mb-2">Tools</div>
      
      {tools.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTool(t.id)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === t.id 
              ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={t.tooltip}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-2" />

      <button
        onClick={onImageRequest}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Importar Imagem"
      >
        <ImagePlus size={20} />
      </button>

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-2" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Desfazer (Ctrl+Z)"
      >
        <Undo2 size={20} />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Refazer (Ctrl+Y)"
      >
        <Redo2 size={20} />
      </button>

      <div className="flex-1" />

      <button
        onClick={onClear}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        title="Limpar Canvas"
      >
        <Trash2 size={20} />
      </button>
    </div>
  )
}
