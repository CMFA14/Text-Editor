import React, { useEffect, useState, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { Trash2, Type, Square, Circle, LineChart as LineIcon, MousePointer2, Brush, ImagePlus, Undo2, Redo2, Wand2 } from 'lucide-react'
import Toolbar from './Toolbar'
import CanvasArea from './CanvasArea'
import PropertiesPanel from './PropertiesPanel'

interface FlimasEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  readOnly: boolean
  onChange: (json: string) => void
}

export type FlimasTool = 'select' | 'brush' | 'text' | 'rect' | 'circle' | 'line' | 'crop' | 'image' | 'erase'

export default function FlimasEditor({
  fileId,
  initialContent,
  darkMode,
  readOnly,
  onChange
}: FlimasEditorProps) {
  const [activeTool, setActiveTool] = useState<FlimasTool>('select')
  const [color, setColor] = useState('#7c3aed')
  const [brushSize, setBrushSize] = useState(5)
  const [fontFamily, setFontFamily] = useState('sans-serif')
  const [fontSize, setFontSize] = useState(40)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [objWidth, setObjWidth] = useState(100)
  const [objHeight, setObjHeight] = useState(100)

  // Histórico
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isHistoryUpdate = useRef(false)

  // Múltiplas páginas
  const [pages, setPages] = useState<string[]>([''])
  const [currentPage, setCurrentPage] = useState(0)
  
  const fabricCanvases = useRef<(fabric.Canvas | null)[]>([])
  const activeCanvas = fabricCanvases.current[currentPage]

  const saveContent = useCallback(() => {
    if (!fabricCanvases.current[currentPage]) return;
    
    // Pegar o estado atualizado da página atual antes de salvar o payload total
    const currentJson = JSON.stringify(fabricCanvases.current[currentPage]!.toJSON())
    
    setPages(prev => {
       const next = [...prev]
       next[currentPage] = currentJson
       const payload = JSON.stringify({
         isFlimasMulti: true,
         pages: next,
         currentPage: currentPage
       })
       onChange(payload)
       return next
    })

    if (isHistoryUpdate.current) {
      isHistoryUpdate.current = false
      return
    }

    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(currentJson)
      return next
    })
    setHistoryIndex(prev => prev + 1)
  }, [currentPage, onChange, historyIndex])

  const handlePageInit = (index: number, c: fabric.Canvas) => {
    fabricCanvases.current[index] = c
    
    if (pages[index]) {
      try {
        c.loadFromJSON(pages[index], () => {
          c.renderAll()
          // Garantir que nenhum objeto comece selecionado ou "travado"
          c.discardActiveObject()
        })
      } catch (e) {
        console.error("Failed to load page json", e)
      }
    }

    c.on('object:modified', saveContent)
    c.on('object:added', (e) => {
        if(!(e as any).isExternal) saveContent();
    })
    c.on('object:removed', saveContent)
    c.on('path:created', saveContent)
    
    // Click listener unificado
    c.on('mouse:down', (opt: any) => {
       handleCanvasClick(c, opt)
    })

    // Sincronizar dimensões do objeto selecionado para o painel
    c.on('selection:created', (e) => syncDimensions(e.selected?.[0]))
    c.on('selection:updated', (e) => syncDimensions(e.selected?.[0]))
    c.on('selection:cleared', () => { setObjWidth(0); setObjHeight(0); })
  }

  const syncDimensions = (obj?: fabric.Object) => {
     if (obj) {
        setObjWidth(Math.round(obj.getScaledWidth()))
        setObjHeight(Math.round(obj.getScaledHeight()))
     }
  }

  // Parse Initial Content
  useEffect(() => {
    if (initialContent) {
      try {
        const data = JSON.parse(initialContent)
        if (data.isFlimasMulti) {
          setPages(data.pages)
          setCurrentPage(data.currentPage || 0)
        } else {
          setPages([initialContent])
        }
      } catch {
        setPages([initialContent])
      }
    }
  }, [initialContent])

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const c = activeCanvas
      if (!c) return
      
      const isEditing = (c.getActiveObject() as any)?.isEditing
      if (isEditing) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = c.getActiveObject()
        if (activeObj) {
           c.remove(activeObj)
           c.discardActiveObject()
           c.renderAll()
           saveContent()
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (historyIndex > 0) {
          isHistoryUpdate.current = true
          const prevJson = history[historyIndex - 1]
          c.loadFromJSON(prevJson, () => c.renderAll())
          setHistoryIndex(prev => prev - 1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCanvas, history, historyIndex, saveContent])

  // Ferramentas e Mouse
  const handleCanvasClick = (c: fabric.Canvas, opt: any) => {
    // Pegar o estado ATUAL da ferramenta via Ref se necessário,
    // mas aqui o listener é re-adicionado ou usa escopo do mount.
    // Usaremos uma referência persistente para a ferramenta ativa para evitar re-binds constantes
  }

  const activeToolRef = useRef(activeTool)
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])

  const handleCanvasClickCore = useCallback((c: fabric.Canvas, opt: any) => {
    const tool = activeToolRef.current
    if (tool === 'select') return
    
    // Se clicou num objeto existente e não é pincel, apenas seleciona
    if (opt.target && tool !== 'brush') return

    const pointer = c.getPointer(opt.e)
    let newObj: fabric.Object | null = null

    if (tool === 'text') {
      newObj = new fabric.IText('Clique para editar', {
        left: pointer.x, top: pointer.y,
        fontFamily, fill: color, fontSize,
        originX: 'center', originY: 'center'
      })
    } else if (tool === 'rect') {
      newObj = new fabric.Rect({
        left: pointer.x, top: pointer.y,
        width: 150, height: 100, fill: color,
        rx: 10, ry: 10, originX: 'center', originY: 'center'
      })
    } else if (tool === 'circle') {
      newObj = new fabric.Circle({
        left: pointer.x, top: pointer.y,
        radius: 60, fill: color,
        originX: 'center', originY: 'center'
      })
    } else if (tool === 'line') {
      newObj = new fabric.Rect({
        left: pointer.x, top: pointer.y,
        width: 200, height: 4, fill: color,
        originX: 'center', originY: 'center'
      })
    }

    if (newObj) {
      c.add(newObj)
      c.setActiveObject(newObj)
      if (tool === 'text') (newObj as fabric.IText).enterEditing()
      setActiveTool('select')
      c.renderAll()
      saveContent()
    }
  }, [color, fontFamily, fontSize, saveContent])

  // Injetar listener de clique real
  useEffect(() => {
     fabricCanvases.current.forEach(c => {
        if (!c) return
        c.off('mouse:down')
        c.on('mouse:down', (opt) => handleCanvasClickCore(c, opt))
     })
  }, [handleCanvasClickCore])

  // Sincronizar Pincel e Selecionabilidade
  useEffect(() => {
    fabricCanvases.current.forEach(c => {
      if (!c) return
      c.isDrawingMode = (activeTool === 'brush')
      if (activeTool === 'brush') {
         const brush = new fabric.PencilBrush(c)
         brush.color = color
         brush.width = brushSize
         c.freeDrawingBrush = brush
      }
      c.selection = (activeTool === 'select')
      c.forEachObject(obj => {
         obj.selectable = (activeTool === 'select')
      })
      c.requestRenderAll()
    })
  }, [activeTool, color, brushSize])

  // Sincronizar Propriedades do Objeto Ativo
  useEffect(() => {
    if (!activeCanvas) return
    const obj = activeCanvas.getActiveObject()
    if (!obj) return

    const changes: any = { fill: color }
    if (obj.type === 'i-text' || obj.type === 'text') {
      changes.fontFamily = fontFamily
      changes.fontSize = fontSize
    }
    
    obj.set(changes)
    activeCanvas.renderAll()
    saveContent()
  }, [color, fontFamily, fontSize, activeCanvas, saveContent])

  // Sincronizar Width/Height Manuais
  useEffect(() => {
     const obj = activeCanvas?.getActiveObject()
     if (obj && (objWidth > 0 || objHeight > 0)) {
        if (objWidth !== Math.round(obj.getScaledWidth())) obj.scaleToWidth(objWidth);
        if (objHeight !== Math.round(obj.getScaledHeight())) obj.scaleToHeight(objHeight);
        activeCanvas?.renderAll()
        saveContent()
     }
  }, [objWidth, objHeight])

  const handleImageAdd = async (dataUrl: string) => {
    if (!activeCanvas) return
    try {
      const ImageClass = fabric.FabricImage || fabric.Image
      const img = await ImageClass.fromURL(dataUrl)
      img.scaleToWidth(400)
      activeCanvas.add(img)
      activeCanvas.setActiveObject(img)
      saveContent()
    } catch (e) { console.error(e) }
  }

  const handleAddPage = () => {
    setPages(prev => [...prev, ''])
    setCurrentPage(pages.length)
    setHistory([''])
    setHistoryIndex(0)
  }

  const handleDeletePage = (idx: number) => {
    if (pages.length <= 1) return
    if (confirm("Excluir esta página?")) {
      const next = pages.filter((_, i) => i !== idx)
      setPages(next)
      fabricCanvases.current = fabricCanvases.current.filter((_, i) => i !== idx)
      setCurrentPage(Math.max(0, currentPage - 1))
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative">
      <Toolbar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onClear={() => {
           if(confirm("Limpar página atual?")) {
              activeCanvas?.clear()
              activeCanvas!.backgroundColor = darkMode ? '#1e293b' : '#ffffff'
              saveContent()
           }
        }}
        onBgRemove={() => alert("IA stub")}
        onImageRequest={() => {
           const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
           input.onchange = (e: any) => {
             const file = e.target.files[0]
             if (file) {
               const reader = new FileReader(); reader.onload = (f) => handleImageAdd(f.target?.result as string); reader.readAsDataURL(file)
             }
           }
           input.click()
        }}
        onUndo={() => {
           if (historyIndex > 0) {
              isHistoryUpdate.current = true
              const json = history[historyIndex - 1]
              activeCanvas?.loadFromJSON(json, () => activeCanvas.renderAll())
              setHistoryIndex(prev => prev - 1)
           }
        }}
        onRedo={() => {
           if (historyIndex < history.length - 1) {
              isHistoryUpdate.current = true
              const json = history[historyIndex + 1]
              activeCanvas?.loadFromJSON(json, () => activeCanvas.renderAll())
              setHistoryIndex(prev => prev + 1)
           }
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />
      
      <div className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-950 p-12 flex flex-col items-center gap-16 custom-scrollbar scroll-smooth">
         {pages.map((p, idx) => (
           <div 
             key={idx}
             onClick={() => setCurrentPage(idx)}
             className={`relative transition-all duration-300 ${currentPage === idx ? 'ring-4 ring-pink-500 ring-offset-8 ring-offset-slate-200 dark:ring-offset-slate-950 rounded-lg' : 'opacity-60 grayscale-[0.3]'}`}
           >
              <div className="absolute -left-20 top-0 flex flex-col items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center font-black text-lg border-2 transition-all ${currentPage === idx ? 'bg-pink-500 text-white border-pink-400 scale-110' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                    {idx + 1}
                 </div>
                 {pages.length > 1 && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                     className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700"
                   >
                     <Trash2 size={18} />
                   </button>
                 )}
              </div>
              <CanvasArea 
                onInit={(c) => handlePageInit(idx, c)} 
                readOnly={readOnly}
                darkMode={darkMode}
              />
           </div>
         ))}

         <button
            onClick={handleAddPage}
            className="w-[1024px] h-32 rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-800 hover:border-pink-500 hover:bg-white dark:hover:bg-slate-900 text-slate-400 hover:text-pink-600 font-black text-xl transition-all flex items-center justify-center gap-4 group shrink-0 shadow-sm"
         >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-pink-500 group-hover:text-white flex items-center justify-center transition-all scale-100 group-hover:scale-110">
               +
            </div>
            ADICIONAR NOVA PÁGINA
         </button>
         <div className="h-24" /> {/* Spacer */}
      </div>

      <PropertiesPanel 
        activeTool={activeTool}
        color={color}    setColor={setColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        fontFamily={fontFamily} setFontFamily={setFontFamily}
        fontSize={fontSize} setFontSize={setFontSize}
        onDelete={() => {
           const obj = activeCanvas?.getActiveObject()
           if (obj) { activeCanvas?.remove(obj); activeCanvas?.discardActiveObject(); activeCanvas?.renderAll(); saveContent(); }
        }}
        width={objWidth} setWidth={setObjWidth}
        height={objHeight} setHeight={setObjHeight}
        brightness={brightness} setBrightness={setBrightness}
        contrast={contrast} setContrast={setContrast}
        saturation={saturation} setSaturation={setSaturation}
      />
    </div>
  )
}
