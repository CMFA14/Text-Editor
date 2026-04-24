import React from 'react'
import { FlimasTool } from './FlimasEditor'
import { Settings2, SlidersHorizontal, Palette } from 'lucide-react'

interface PropertiesPanelProps {
  activeTool: FlimasTool
  color: string
  setColor: (c: string) => void
  brushSize: number
  setBrushSize: (s: number) => void
  fontFamily: string
  setFontFamily: (f: string) => void
  fontSize: number
  setFontSize: (s: number) => void
  brightness: number
  setBrightness: (b: number) => void
  contrast: number
  setContrast: (c: number) => void
  saturation: number
  setSaturation: (s: number) => void
}

export default function PropertiesPanel({
  activeTool,
  color, setColor,
  brushSize, setBrushSize,
  fontFamily, setFontFamily,
  fontSize, setFontSize,
  brightness, setBrightness,
  contrast, setContrast,
  saturation, setSaturation
}: PropertiesPanelProps) {
  
  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-6 overflow-y-auto z-10 shadow-sm shrink-0">
      
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
        <Settings2 size={18} />
        <h3 className="font-bold text-sm">Propriedades</h3>
      </div>

      {(activeTool === 'brush' || activeTool === 'text') && (
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
             <Palette size={14} /> Cor & Tamanho
           </div>
           
           <div className="space-y-2">
             <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cor Selecionada</label>
             <input 
               type="color" 
               value={color}
               onChange={e => setColor(e.target.value)}
               className="w-full h-8 rounded cursor-pointer border-0 bg-transparent p-0"
             />
           </div>

           {activeTool === 'brush' && (
             <div className="space-y-2 flex flex-col">
               <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex justify-between">
                 <span>Tamanho do Pincel</span>
                 <span>{brushSize}px</span>
               </label>
               <input 
                 type="range" 
                 min="1" max="50" 
                 value={brushSize}
                 onChange={e => setBrushSize(Number(e.target.value))}
                 className="accent-pink-500"
               />
             </div>
           )}

           {activeTool === 'text' && (
             <>
               <div className="space-y-2 flex flex-col">
                 <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Fonte</label>
                 <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold"
                 >
                    <option value="sans-serif">Sans-Serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="Inter">Inter</option>
                    <option value="Georgia">Georgia</option>
                 </select>
               </div>
               <div className="space-y-2 flex flex-col">
                 <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex justify-between">
                   <span>Tamanho do Texto</span>
                   <span>{fontSize}px</span>
                 </label>
                 <input 
                   type="range" 
                   min="10" max="150" 
                   value={fontSize}
                   onChange={e => setFontSize(Number(e.target.value))}
                   className="accent-pink-500"
                 />
               </div>
             </>
           )}
        </div>
      )}

      {/* Adjustments (Always visible for testing, but ideally applies to selected image layer) */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <SlidersHorizontal size={14} /> Ajustes (Filtros)
        </div>
        <p className="text-[10px] text-slate-400">Selecione uma imagem no canvas para aplicar os atributos abaixo através da engine CSS WebGL da Fabric.</p>

        <div className="space-y-2 flex flex-col">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex justify-between">
             <span>Brilho</span>
             <span>{brightness}</span>
          </label>
          <input 
             type="range" 
             min="-100" max="100" 
             value={brightness}
             onChange={e => setBrightness(Number(e.target.value))}
             className="accent-pink-500"
          />
        </div>

        <div className="space-y-2 flex flex-col">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex justify-between">
             <span>Contraste</span>
             <span>{contrast}</span>
          </label>
          <input 
             type="range" 
             min="-100" max="100" 
             value={contrast}
             onChange={e => setContrast(Number(e.target.value))}
             className="accent-pink-500"
          />
        </div>

        <div className="space-y-2 flex flex-col">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex justify-between">
             <span>Saturação</span>
             <span>{saturation}</span>
          </label>
          <input 
             type="range" 
             min="-100" max="100" 
             value={saturation}
             onChange={e => setSaturation(Number(e.target.value))}
             className="accent-pink-500"
          />
        </div>
      </div>

    </div>
  )
}
