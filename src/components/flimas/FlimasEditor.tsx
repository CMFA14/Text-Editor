import React, { useEffect, useState, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import Toolbar from './Toolbar'
import CanvasArea from './CanvasArea'
import PropertiesPanel from './PropertiesPanel'
import PageNavigation from './PageNavigation'

interface FlimasEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  readOnly: boolean
  onChange: (json: string) => void
}

export type FlimasTool = 'select' | 'brush' | 'text' | 'rect' | 'circle' | 'crop' | 'image' | 'erase'

export default function FlimasEditor({
  fileId,
  initialContent,
  darkMode,
  readOnly,
  onChange
}: FlimasEditorProps) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [activeTool, setActiveTool] = useState<FlimasTool>('select')
  const [color, setColor] = useState('#7c3aed')
  const [brushSize, setBrushSize] = useState(5)
  const [fontFamily, setFontFamily] = useState('sans-serif')
  const [fontSize, setFontSize] = useState(40)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)

  // Histórico
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isHistoryUpdate = useRef(false)

  // Múltiplas páginas
  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  // Initialization will be triggered inside CanvasArea when it mounts
  const handleCanvasInit = useCallback((c: fabric.Canvas) => {
    setCanvas(c)
    
    // Parse Initial Content (Multi-page ou Legacy Single-page)
    let initialPages = ['']
    let startPage = 0
    if (initialContent) {
      try {
        const data = JSON.parse(initialContent)
        if (data.isFlimasMulti) {
          initialPages = data.pages
          startPage = data.currentPage || 0
        } else {
          initialPages = [initialContent]
        }
      } catch {
        initialPages = [initialContent]
      }
    }
    setPages(initialPages)
    setCurrentPage(startPage)

    if (initialPages[startPage]) {
      try {
        c.loadFromJSON(initialPages[startPage], () => c.renderAll())
      } catch (e) {
        console.error("Failed to load fabric json", e)
      }
    }

    c.on('object:modified', saveContent)
    c.on('object:added', saveContent)
    c.on('object:removed', saveContent)
    c.on('path:created', saveContent)
  }, [initialContent])

  const saveContent = useCallback(() => {
    if (!canvas) return
    const currentJson = JSON.stringify(canvas.toJSON())
    
    setPages(prevPages => {
      const nextPages = [...prevPages]
      nextPages[currentPage] = currentJson
      
      const payload = JSON.stringify({
        isFlimasMulti: true,
        pages: nextPages,
        currentPage: currentPage
      })
      onChange(payload)
      return nextPages
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
  }, [canvas, onChange, historyIndex, currentPage])

  useEffect(() => {
    // Initial save so we have something in history 0
    if (historyIndex === -1 && canvas) {
      saveContent()
    }
  }, [canvas, historyIndex, saveContent])

  // Desfazer / Refazer (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (historyIndex > 0) {
          isHistoryUpdate.current = true
          const prevJson = history[historyIndex - 1]
          canvas?.loadFromJSON(prevJson, () => canvas.renderAll())
          setHistoryIndex(prev => prev - 1)
          onChange(prevJson)
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        if (historyIndex < history.length - 1) {
          isHistoryUpdate.current = true
          const nextJson = history[historyIndex + 1]
          canvas?.loadFromJSON(nextJson, () => canvas.renderAll())
          setHistoryIndex(prev => prev + 1)
          onChange(nextJson)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history, historyIndex, canvas, onChange])

  useEffect(() => {
    if (!canvas) return

    canvas.isDrawingMode = activeTool === 'brush'
    
    if (canvas.isDrawingMode) {
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
      }
      canvas.freeDrawingBrush.color = color
      canvas.freeDrawingBrush.width = brushSize
    }

    if (activeTool === 'text') {
      canvas.defaultCursor = 'text'
    } else if (activeTool === 'select') {
      canvas.defaultCursor = 'default'
    }

  }, [canvas, activeTool, color, brushSize])

  // Suporte a adicionar texto via clique
  useEffect(() => {
    if (!canvas) return
    const onMouseDown = (opt: any) => {
      if (!opt.target) {
        const pointer = canvas.getPointer(opt.e)
        // TEXT
        if (activeTool === 'text') {
          const text = new fabric.IText('Digite aqui', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: fontFamily,
            fill: color,
            fontSize: fontSize
          })
          canvas.add(text)
          canvas.setActiveObject(text)
          text.enterEditing()
          text.selectAll()
          setActiveTool('select')
          saveContent()
        }
        // RECT
        else if (activeTool === 'rect') {
          const rect = new fabric.Rect({
            left: pointer.x - 50,
            top: pointer.y - 50,
            width: 100,
            height: 100,
            fill: color,
            rx: 8,
            ry: 8
          })
          canvas.add(rect)
          canvas.setActiveObject(rect)
          setActiveTool('select')
          saveContent()
        }
        // CIRCLE
        else if (activeTool === 'circle') {
          const circle = new fabric.Circle({
            left: pointer.x - 50,
            top: pointer.y - 50,
            radius: 50,
            fill: color
          })
          canvas.add(circle)
          canvas.setActiveObject(circle)
          setActiveTool('select')
          saveContent()
        }
      }
    }
    canvas.on('mouse:down', onMouseDown)
    return () => { canvas.off('mouse:down', onMouseDown) }
  }, [canvas, activeTool, color, saveContent])

  const handleImageAdd = async (dataUrl: string) => {
    if (!canvas) return
    try {
      // @ts-ignore - Support for v6/v7 FabricImage or v5 Image
      const ImageClass = fabric.FabricImage || fabric.Image
      const img = await ImageClass.fromURL(dataUrl)
      canvas.add(img)
      canvas.setActiveObject(img)
      saveContent()
    } catch (e) {
      console.error("Falha ao adicionar imagem", e)
    }
  }

  // Handle generic AI stubs
  const handleAIBgRemoval = () => {
    alert("Recurso de IA Integrado (Stub): Acesso à API de remoção de fundo (ex: Remove.bg) será ativado no futuro. Por ora, você possui um Canvas avançado onde essas integrações podem ser adicionadas perfeitamente no objeto fabric.Image ativo.")
  }

  const handleClear = () => {
    if (confirm("Tem certeza que deseja limpar tudo?")) {
      if (canvas) {
        canvas.getObjects().forEach(o => canvas.remove(o))
        canvas.backgroundColor = darkMode ? '#1e293b' : '#ffffff'
        canvas.renderAll()
      }
      saveContent()
    }
  }

  // Sincroniza as mudanças do painel com o texto selecionado
  useEffect(() => {
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
      (obj as fabric.IText).set({ fill: color, fontFamily, fontSize })
      canvas.renderAll()
      saveContent()
    }
  }, [color, fontFamily, fontSize, canvas, saveContent])

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative">
      <Toolbar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onClear={handleClear}
        onBgRemove={handleAIBgRemoval}
        onImageRequest={() => {
           const input = document.createElement('input')
           input.type = 'file'
           input.accept = 'image/*'
           input.onchange = (e: any) => {
             const file = e.target.files[0]
             if (file) {
               const reader = new FileReader()
               reader.onload = (f) => handleImageAdd(f.target?.result as string)
               reader.readAsDataURL(file)
             }
           }
           input.click()
        }}
        onUndo={() => {
           if (historyIndex > 0) {
              isHistoryUpdate.current = true
              const prevJson = history[historyIndex - 1]
              canvas?.loadFromJSON(prevJson, () => canvas.renderAll())
              setHistoryIndex(prev => prev - 1)
              saveContent()
           }
        }}
        onRedo={() => {
           if (historyIndex < history.length - 1) {
              isHistoryUpdate.current = true
              const nextJson = history[historyIndex + 1]
              canvas?.loadFromJSON(nextJson, () => canvas.renderAll())
              setHistoryIndex(prev => prev + 1)
              saveContent()
           }
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />
      
      <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-900/50 relative flex items-center justify-center p-8">
         <CanvasArea 
           onInit={handleCanvasInit} 
           readOnly={readOnly}
           darkMode={darkMode}
         />
         
         <PageNavigation 
            currentPage={currentPage}
            totalPages={pages.length}
            onPageChange={(idx) => {
               if (!canvas) return
               saveContent() // ensure current is pushed
               setCurrentPage(idx)
               isHistoryUpdate.current = true
               canvas.clear()
               if (pages[idx]) {
                 canvas.loadFromJSON(pages[idx], () => {
                   canvas.renderAll()
                   setHistory([pages[idx]])
                   setHistoryIndex(0)
                 })
               }
            }}
            onAddPage={() => {
               if (!canvas) return
               saveContent()
               const newPages = [...pages, '']
               setPages(newPages)
               setCurrentPage(newPages.length - 1)
               isHistoryUpdate.current = true
               canvas.clear()
               canvas.backgroundColor = darkMode ? '#1e293b' : '#ffffff'
               canvas.renderAll()
               setHistory([''])
               setHistoryIndex(0)
            }}
            onDeletePage={() => {
               if (!canvas || pages.length <= 1) return
               if (confirm("Deseja realmente excluir este slide?")) {
                  const newPages = pages.filter((_, i) => i !== currentPage)
                  const nextIdx = Math.max(0, currentPage - 1)
                  setPages(newPages)
                  setCurrentPage(nextIdx)
                  isHistoryUpdate.current = true
                  canvas.clear()
                  if (newPages[nextIdx]) {
                    canvas.loadFromJSON(newPages[nextIdx], () => {
                      canvas.renderAll()
                      setHistory([newPages[nextIdx]])
                      setHistoryIndex(0)
                      saveContent()
                    })
                  }
               }
            }}
         />
      </div>

      <PropertiesPanel 
        activeTool={activeTool}
        color={color}    setColor={setColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        fontFamily={fontFamily} setFontFamily={setFontFamily}
        fontSize={fontSize} setFontSize={setFontSize}
        brightness={brightness}
        setBrightness={(b) => {
           setBrightness(b);
           applyFilter('brightness', b / 100);
        }}
        contrast={contrast}
        setContrast={(c) => {
           setContrast(c);
           applyFilter('contrast', c / 100);
        }}
        saturation={saturation}
        setSaturation={(s) => {
           setSaturation(s)
           applyFilter('saturation', s / 100)
        }}
      />
    </div>
  )

  // Implementation helper for filters
  function applyFilter(type: string, value: number) {
     if (!canvas) return;
     const obj = canvas.getActiveObject();
     if (!obj || obj.type !== 'image') {
        alert("Selecione uma imagem para aplicar o ajuste!");
        return;
     }

     const img = obj as fabric.Image;
     let filterFunc: fabric.IBaseFilter | undefined;

     // Basic stub for generic fabric image filters
     if (type === 'brightness') {
        filterFunc = new fabric.filters.Brightness({ brightness: value });
     } else if (type === 'contrast') {
        filterFunc = new fabric.filters.Contrast({ contrast: value });
     } else if (type === 'saturation') {
        filterFunc = new fabric.filters.Saturation({ saturation: value });
     }

     if (filterFunc) {
        // Replace or append
        img.filters = img.filters || [];
        const existingIdx = img.filters.findIndex((f) => f && (f as any).type === filterFunc?.type);
        if (existingIdx > -1) {
           (img.filters as fabric.IBaseFilter[])[existingIdx] = filterFunc;
        } else {
           (img.filters as fabric.IBaseFilter[]).push(filterFunc);
        }
        img.applyFilters();
        canvas.renderAll();
        saveContent();
     }
  }
}
