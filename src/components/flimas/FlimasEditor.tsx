import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import * as fabric from 'fabric'
import CanvasArea from './CanvasArea'
import Toolbar from './Toolbar'
import PropertiesPanel from './PropertiesPanel'

// ── Tipos ─────────────────────────────────────────────────
export type FlimasTool =
  | 'select' | 'pan' | 'brush' | 'eraser' | 'text'
  | 'rect' | 'circle' | 'triangle' | 'line' | 'arrow'

export interface AdjustParams {
  brightness: number     // -1..1
  contrast: number       // -1..1
  saturation: number     // -1..1
  hue: number            // -1..1 (rotação)
  blur: number           // 0..1
  preset: 'none' | 'grayscale' | 'sepia' | 'invert' | 'vintage' | 'kodachrome' | 'polaroid' | 'bw' | 'brownie' | 'technicolor'
}

const DEFAULT_ADJUST: AdjustParams = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, preset: 'none',
}

interface FlimasEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  readOnly: boolean
  onChange: (json: string) => void
}

interface StoredDoc {
  version: 1
  width: number
  height: number
  background: string
  canvas: unknown
}

// Marcadores de propriedades customizadas que devem ser serializadas
const CUSTOM_PROPS = ['flimasAdjust', 'flimasName', 'flimasKind']

// Importação pendente (vinda do dashboard via drop-to-create)
interface PendingImport { __flimasImport: string }

function safeParse(raw: string): unknown {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ── Utilidades de filtros ─────────────────────────────────
type AnyFilter = fabric.filters.BaseFilter<string>
function buildFilters(params: AdjustParams): AnyFilter[] {
  const f: AnyFilter[] = []
  if (params.brightness !== 0) f.push(new fabric.filters.Brightness({ brightness: params.brightness }))
  if (params.contrast !== 0) f.push(new fabric.filters.Contrast({ contrast: params.contrast }))
  if (params.saturation !== 0) f.push(new fabric.filters.Saturation({ saturation: params.saturation }))
  if (params.hue !== 0) f.push(new fabric.filters.HueRotation({ rotation: params.hue }))
  if (params.blur > 0) f.push(new fabric.filters.Blur({ blur: params.blur }))
  switch (params.preset) {
    case 'grayscale':    f.push(new fabric.filters.Grayscale()); break
    case 'sepia':        f.push(new fabric.filters.Sepia()); break
    case 'invert':       f.push(new fabric.filters.Invert()); break
    case 'vintage':      f.push(new fabric.filters.Vintage()); break
    case 'kodachrome':   f.push(new fabric.filters.Kodachrome()); break
    case 'polaroid':     f.push(new fabric.filters.Polaroid()); break
    case 'bw':           f.push(new fabric.filters.BlackWhite()); break
    case 'brownie':      f.push(new fabric.filters.Brownie()); break
    case 'technicolor':  f.push(new fabric.filters.Technicolor()); break
  }
  return f
}

function isFabricImage(obj: fabric.Object | undefined | null): obj is fabric.FabricImage {
  return !!obj && (obj.type === 'image' || obj instanceof fabric.FabricImage)
}

// ── Componente principal ──────────────────────────────────
export default function FlimasEditor({
  fileId, initialContent, darkMode, readOnly, onChange,
}: FlimasEditorProps) {
  // Canvas persistência
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 })
  const [background, setBackground] = useState('#ffffff')

  // Ferramenta ativa
  const [activeTool, setActiveTool] = useState<FlimasTool>('select')

  // Propriedades do "próximo objeto a criar" (pincel, texto, shape)
  const [brushColor, setBrushColor] = useState('#7c3aed')
  const [brushSize, setBrushSize] = useState(6)
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif')
  const [fontSize, setFontSize] = useState(48)

  // Zoom controlado
  const [zoom, setZoom] = useState(1)

  // Active object snapshot (lido do canvas, não "source of truth")
  const [activeSnapshot, setActiveSnapshot] = useState<ActiveSnapshot | null>(null)

  // Layers
  const [layers, setLayers] = useState<LayerInfo[]>([])

  // Histórico
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const [historyVersion, setHistoryVersion] = useState(0)  // força re-render quando muda

  const canvasRef = useRef<fabric.Canvas | null>(null)
  const isRestoringRef = useRef(false)
  const suspendChangeRef = useRef(false)
  const initialImportedRef = useRef(false)
  const clipboardRef = useRef<fabric.Object | null>(null)

  // ── Helpers ──────────────────────────────────────────
  const getCanvas = () => canvasRef.current

  const refreshLayers = useCallback(() => {
    const c = getCanvas()
    if (!c) return
    const list: LayerInfo[] = c.getObjects().map((o, i) => ({
      idx: i,
      name: (o as FabricObjWithMeta).flimasName || defaultLayerName(o),
      type: o.type || 'object',
      visible: o.visible !== false,
      locked: o.selectable === false && o.evented === false,
      opacity: o.opacity ?? 1,
      isImage: isFabricImage(o),
      ref: o,
    }))
    setLayers(list.reverse())  // topo da lista = topo do canvas
  }, [])

  const syncActiveSnapshot = useCallback(() => {
    const c = getCanvas()
    if (!c) { setActiveSnapshot(null); return }
    const obj = c.getActiveObject()
    if (!obj) { setActiveSnapshot(null); return }
    setActiveSnapshot(snapshotFromObject(obj))
  }, [])

  const pushHistory = useCallback(() => {
    const c = getCanvas()
    if (!c) return
    if (isRestoringRef.current) return
    const json = JSON.stringify((c.toJSON as (p?: string[]) => unknown)(CUSTOM_PROPS))
    const hist = historyRef.current
    // trim future se estávamos em meio ao undo
    if (historyIndexRef.current < hist.length - 1) {
      hist.length = historyIndexRef.current + 1
    }
    // não duplicar
    if (hist[hist.length - 1] === json) return
    hist.push(json)
    // cap de 50 snapshots
    if (hist.length > 50) hist.shift()
    historyIndexRef.current = hist.length - 1
    setHistoryVersion(v => v + 1)
  }, [])

  const persistDoc = useCallback(() => {
    const c = getCanvas()
    if (!c) return
    const doc: StoredDoc = {
      version: 1,
      width: c.getWidth(),
      height: c.getHeight(),
      background: background,
      canvas: (c.toJSON as (p?: string[]) => unknown)(CUSTOM_PROPS),
    }
    onChange(JSON.stringify(doc))
  }, [background, onChange])

  // Ref estável para persistDoc e pushHistory (evita stale closures nos listeners)
  const persistRef = useRef(persistDoc)
  const pushHistRef = useRef(pushHistory)
  useEffect(() => { persistRef.current = persistDoc }, [persistDoc])
  useEffect(() => { pushHistRef.current = pushHistory }, [pushHistory])

  const handleChange = useCallback(() => {
    if (suspendChangeRef.current) return
    pushHistRef.current()
    persistRef.current()
    refreshLayers()
  }, [refreshLayers])

  const handleChangeRef = useRef(handleChange)
  useEffect(() => { handleChangeRef.current = handleChange }, [handleChange])

  // ── Init do canvas ────────────────────────────────────
  const handleInit = useCallback((c: fabric.Canvas) => {
    canvasRef.current = c

    // Listeners – todos passam pela ref para não segurar closure antiga
    c.on('object:modified', () => handleChangeRef.current())
    c.on('object:added',    () => handleChangeRef.current())
    c.on('object:removed',  () => handleChangeRef.current())
    c.on('path:created',    () => handleChangeRef.current())

    const onSel = () => syncActiveSnapshot()
    c.on('selection:created', onSel)
    c.on('selection:updated', onSel)
    c.on('selection:cleared', onSel)

    // Carrega conteúdo
    const raw = initialContent
    const parsed = safeParse(raw)

    // Caso 1: import pendente vindo do dashboard (dataURL único)
    if (!initialImportedRef.current && parsed && typeof parsed === 'object' && '__flimasImport' in parsed) {
      initialImportedRef.current = true
      const dataUrl = (parsed as PendingImport).__flimasImport
      loadImageIntoCanvas(c, dataUrl).then(() => {
        pushHistRef.current()
        persistRef.current()
        refreshLayers()
      })
      return
    }

    // Caso 2: documento Flimas v1
    if (parsed && typeof parsed === 'object' && 'canvas' in parsed && 'version' in parsed) {
      const doc = parsed as StoredDoc
      if (doc.width && doc.height) setCanvasSize({ width: doc.width, height: doc.height })
      if (doc.background) setBackground(doc.background)
      suspendChangeRef.current = true
      c.loadFromJSON(doc.canvas as object).then(() => {
        c.renderAll()
        // Reaplica filtros às imagens (preserva sliders não-destrutivos)
        c.getObjects().forEach(o => {
          if (isFabricImage(o)) {
            const adj = (o as FabricImgWithMeta).flimasAdjust
            if (adj) {
              o.filters = buildFilters(adj)
              o.applyFilters()
            }
          }
        })
        c.renderAll()
        suspendChangeRef.current = false
        pushHistRef.current()   // snapshot inicial
        refreshLayers()
      }).catch(e => {
        console.error('Falha ao carregar canvas', e)
        suspendChangeRef.current = false
        pushHistRef.current()
      })
      return
    }

    // Caso 3: vazio — começa com snapshot em branco
    pushHistRef.current()
    refreshLayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent])

  // ── Sincronização de brush / cursor / interação com a ferramenta ──
  useEffect(() => {
    const c = getCanvas()
    if (!c) return

    // pan tool: desliga interação normal, cursor vira mão (Alt já faz pan, mas 'pan' força)
    const isBrush = activeTool === 'brush' || activeTool === 'eraser'

    c.isDrawingMode = isBrush && !readOnly
    c.selection = activeTool === 'select' && !readOnly
    c.skipTargetFind = activeTool !== 'select' || readOnly

    c.defaultCursor =
      activeTool === 'pan' ? 'grab' :
      activeTool === 'text' ? 'text' :
      activeTool === 'select' ? 'default' :
      'crosshair'

    if (isBrush) {
      // Pincel simples. Borracha = destination-out no globalCompositeOperation do caminho.
      const pencil = new fabric.PencilBrush(c)
      pencil.color = activeTool === 'eraser' ? '#000000' : brushColor
      pencil.width = brushSize
      c.freeDrawingBrush = pencil
      // Hack: quando path é criado no modo eraser, aplicamos composite operation
      if (activeTool === 'eraser') {
        const handler = (e: { path: fabric.Path }) => {
          e.path.globalCompositeOperation = 'destination-out'
          c.requestRenderAll()
        }
        c.on('path:created', handler)
        return () => { c.off('path:created', handler) }
      }
    }
  }, [activeTool, brushColor, brushSize, readOnly])

  // ── Criação de shapes / texto ao clicar ────────────────
  useEffect(() => {
    const c = getCanvas()
    if (!c) return
    if (readOnly) return

    const isShape = ['rect','circle','triangle','line','arrow','text'].includes(activeTool)
    if (!isShape) return

    const onMouseDown = (opt: fabric.TPointerEventInfo) => {
      const e = opt.e as MouseEvent
      if (e.altKey) return   // pan

      const pointer = c.getViewportPoint(opt.e)
      const scenePoint = c.getScenePoint(opt.e)
      void pointer
      const x = scenePoint.x
      const y = scenePoint.y

      let obj: fabric.Object | null = null
      const commonProps = {
        left: x, top: y, originX: 'center' as const, originY: 'center' as const,
        fill: brushColor,
      }
      switch (activeTool) {
        case 'rect':
          obj = new fabric.Rect({ ...commonProps, width: 180, height: 120, rx: 6, ry: 6 })
          break
        case 'circle':
          obj = new fabric.Ellipse({ ...commonProps, rx: 80, ry: 60 })
          break
        case 'triangle':
          obj = new fabric.Triangle({ ...commonProps, width: 160, height: 140 })
          break
        case 'line':
          obj = new fabric.Line([x - 100, y, x + 100, y], { stroke: brushColor, strokeWidth: 4, fill: undefined })
          break
        case 'arrow': {
          // Seta como Path simples: linha + ponta
          const path = `M ${x - 80} ${y} L ${x + 70} ${y} L ${x + 60} ${y - 12} M ${x + 70} ${y} L ${x + 60} ${y + 12}`
          obj = new fabric.Path(path, { stroke: brushColor, strokeWidth: 4, fill: undefined, originX: 'left', originY: 'top' })
          break
        }
        case 'text': {
          const t = new fabric.IText('Escreva aqui', {
            ...commonProps,
            fontFamily, fontSize, fill: brushColor, editable: true,
          })
          obj = t
          break
        }
      }

      if (!obj) return
      c.add(obj)
      c.setActiveObject(obj)
      if (obj instanceof fabric.IText) obj.enterEditing()
      c.requestRenderAll()
      setActiveTool('select')
    }

    c.on('mouse:down', onMouseDown)
    return () => { c.off('mouse:down', onMouseDown) }
  }, [activeTool, brushColor, fontFamily, fontSize, readOnly])

  // ── Clipboard interno (copy/cut/paste/duplicate) ───────
  const doCopy = useCallback(async (): Promise<fabric.Object | null> => {
    const c = getCanvas(); if (!c) return null
    const active = c.getActiveObject()
    if (!active) return null
    // clone preserva ActiveSelection (multi-seleção) e custom props
    const cloned = await active.clone(CUSTOM_PROPS)
    clipboardRef.current = cloned
    return cloned
  }, [])

  const doPaste = useCallback(async () => {
    const c = getCanvas(); if (!c) return
    if (readOnly) return
    const source = clipboardRef.current
    if (!source) return
    // clone novamente pra poder colar várias vezes sem duplicar a referência
    const cloned = await source.clone(CUSTOM_PROPS)
    cloned.set({
      left: (cloned.left ?? 0) + 20,
      top:  (cloned.top ?? 0) + 20,
      evented: true,
    })
    // mantém a referência do clipboard com o novo offset pra próximos paste incrementarem
    clipboardRef.current = cloned
    // Se for ActiveSelection (multi-seleção), expandir pra múltiplos add + seleção
    const maybeSel = cloned as fabric.Object & { canvas?: fabric.Canvas; forEachObject?: (fn: (o: fabric.Object) => void) => void }
    if (cloned.type === 'activeSelection' && typeof maybeSel.forEachObject === 'function') {
      maybeSel.canvas = c
      maybeSel.forEachObject((o: fabric.Object) => c.add(o))
      ;(cloned as fabric.Object & { setCoords: () => void }).setCoords()
    } else {
      c.add(cloned)
    }
    c.setActiveObject(cloned)
    c.requestRenderAll()
    handleChangeRef.current()
  }, [readOnly])

  const doCut = useCallback(async () => {
    const c = getCanvas(); if (!c) return
    if (readOnly) return
    await doCopy()
    const sel = c.getActiveObjects()
    sel.forEach(o => c.remove(o))
    c.discardActiveObject()
    c.requestRenderAll()
  }, [doCopy, readOnly])

  const doDuplicate = useCallback(async () => {
    if (readOnly) return
    const hadClip = clipboardRef.current
    await doCopy()
    await doPaste()
    // restaura o clipboard anterior se havia — Ctrl+D não deve "roubar" o copy manual
    if (hadClip) clipboardRef.current = hadClip
  }, [doCopy, doPaste, readOnly])

  const doSelectAll = useCallback(() => {
    const c = getCanvas(); if (!c) return
    if (readOnly) return
    const all = c.getObjects().filter(o => o.selectable !== false && o.visible !== false)
    if (all.length === 0) return
    if (all.length === 1) { c.setActiveObject(all[0]); c.requestRenderAll(); return }
    const sel = new fabric.ActiveSelection(all, { canvas: c })
    c.setActiveObject(sel)
    c.requestRenderAll()
  }, [readOnly])

  // ── Shortcuts de teclado ──────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const c = getCanvas()
      if (!c) return
      const activeObj = c.getActiveObject()
      const isEditingText = activeObj && 'isEditing' in activeObj && (activeObj as fabric.IText).isEditing
      if (isEditingText) return

      const ctrl = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()

      // Undo / Redo
      if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); return }
      if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); return }

      // Copy / Cut / Paste / Duplicate / Select All
      if (ctrl && k === 'c' && !e.shiftKey) { e.preventDefault(); void doCopy(); return }
      if (ctrl && k === 'x' && !e.shiftKey) { e.preventDefault(); void doCut(); return }
      if (ctrl && k === 'v' && !e.shiftKey) { e.preventDefault(); void doPaste(); return }
      if (ctrl && k === 'd' && !e.shiftKey) { e.preventDefault(); void doDuplicate(); return }
      if (ctrl && k === 'a' && !e.shiftKey) { e.preventDefault(); doSelectAll(); return }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeObj && !readOnly) {
        e.preventDefault()
        const sel = c.getActiveObjects()
        sel.forEach(o => c.remove(o))
        c.discardActiveObject()
        c.requestRenderAll()
        return
      }

      // Ferramentas (sem modificador)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (k) {
          case 'v': setActiveTool('select'); break
          case 'h': setActiveTool('pan'); break
          case 'b': setActiveTool('brush'); break
          case 'e': setActiveTool('eraser'); break
          case 't': setActiveTool('text'); break
          case 'r': setActiveTool('rect'); break
          case 'o': setActiveTool('circle'); break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  // ── Undo / Redo ────────────────────────────────────────
  const doUndo = useCallback(() => {
    const hist = historyRef.current
    const idx = historyIndexRef.current
    if (idx <= 0) return
    const c = getCanvas(); if (!c) return
    const target = hist[idx - 1]
    historyIndexRef.current = idx - 1
    isRestoringRef.current = true
    suspendChangeRef.current = true
    c.loadFromJSON(JSON.parse(target)).then(() => {
      c.renderAll()
      isRestoringRef.current = false
      suspendChangeRef.current = false
      persistRef.current()
      refreshLayers()
      syncActiveSnapshot()
      setHistoryVersion(v => v + 1)
    })
  }, [refreshLayers, syncActiveSnapshot])

  const doRedo = useCallback(() => {
    const hist = historyRef.current
    const idx = historyIndexRef.current
    if (idx >= hist.length - 1) return
    const c = getCanvas(); if (!c) return
    const target = hist[idx + 1]
    historyIndexRef.current = idx + 1
    isRestoringRef.current = true
    suspendChangeRef.current = true
    c.loadFromJSON(JSON.parse(target)).then(() => {
      c.renderAll()
      isRestoringRef.current = false
      suspendChangeRef.current = false
      persistRef.current()
      refreshLayers()
      syncActiveSnapshot()
      setHistoryVersion(v => v + 1)
    })
  }, [refreshLayers, syncActiveSnapshot])

  const canUndo = useMemo(() => historyIndexRef.current > 0, [historyVersion])
  const canRedo = useMemo(() => historyIndexRef.current < historyRef.current.length - 1, [historyVersion])

  // ── Zoom handlers ──────────────────────────────────────
  const zoomIn  = () => setZoom(z => Math.min(8, +(z * 1.25).toFixed(3)))
  const zoomOut = () => setZoom(z => Math.max(0.1, +(z / 1.25).toFixed(3)))
  const zoomReset = () => setZoom(1)
  const zoomFit = () => {
    // 1 seria "real"; para fit usamos algo razoável relativo ao container — aqui aproximo por 0.8
    setZoom(0.8)
  }

  // ── Import image ───────────────────────────────────────
  const importImageFromFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const c = getCanvas(); if (!c) return
        loadImageIntoCanvas(c, String(reader.result || ''))
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [])

  const onDropImage = useCallback((dataUrl: string) => {
    const c = getCanvas(); if (!c) return
    loadImageIntoCanvas(c, dataUrl)
  }, [])

  // ── Export ─────────────────────────────────────────────
  const doExport = useCallback(async (format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf') => {
    const c = getCanvas(); if (!c) return

    // Reset zoom/pan temporariamente pra export 1:1
    const vpt = c.viewportTransform ? [...c.viewportTransform] : null
    c.setViewportTransform([1, 0, 0, 1, 0, 0])

    try {
      if (format === 'svg') {
        const svg = c.toSVG()
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'flimas-image.svg'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        return
      }

      const imgFormat: 'png' | 'jpeg' | 'webp' =
        format === 'jpeg' ? 'jpeg' :
        format === 'webp' ? 'webp' : 'png'

      const dataUrl = c.toDataURL({
        format: imgFormat,
        quality: imgFormat === 'png' ? 1 : 0.92,
        multiplier: 1,
        enableRetinaScaling: false,
      })

      if (format === 'pdf') {
        const w = c.getWidth()
        const h = c.getHeight()
        // Lazy-load html2pdf só quando precisa
        const html2pdfMod = await import('html2pdf.js')
        const html2pdf = (html2pdfMod as { default: (...args: unknown[]) => unknown }).default
        const holder = document.createElement('div')
        holder.style.width = `${w}px`
        holder.style.height = `${h}px`
        holder.style.position = 'fixed'
        holder.style.left = '-99999px'
        holder.style.top = '0'
        const img = document.createElement('img')
        img.src = dataUrl
        img.style.width = `${w}px`
        img.style.height = `${h}px`
        img.style.display = 'block'
        holder.appendChild(img)
        document.body.appendChild(holder)
        try {
          await (html2pdf as (...a: unknown[]) => { from: (x: unknown) => { set: (o: unknown) => { save: () => Promise<void> } } })()
            .from(holder)
            .set({
              margin: 0,
              filename: 'flimas-image.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: {
                unit: 'px',
                format: [w, h],
                orientation: w >= h ? 'landscape' : 'portrait',
              },
            })
            .save()
        } finally {
          holder.remove()
        }
        return
      }

      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `flimas-image.${format}`
      a.click()
    } catch (err) {
      console.error('Falha ao exportar', err)
      alert('Não foi possível exportar. Veja o console.')
    } finally {
      if (vpt) c.setViewportTransform(vpt as fabric.TMat2D)
    }
  }, [])

  // ── Clear canvas ───────────────────────────────────────
  const clearAll = useCallback(() => {
    if (!confirm('Limpar todos os objetos do canvas? O fundo e o tamanho permanecem.')) return
    const c = getCanvas(); if (!c) return
    c.getObjects().slice().forEach(o => c.remove(o))
    c.discardActiveObject()
    c.requestRenderAll()
  }, [])

  // ── Props → objeto ativo ───────────────────────────────
  const mutateActive = useCallback((fn: (obj: fabric.Object) => void) => {
    const c = getCanvas(); if (!c) return
    const obj = c.getActiveObject(); if (!obj) return
    fn(obj)
    obj.setCoords()
    c.requestRenderAll()
    handleChangeRef.current()
    syncActiveSnapshot()
  }, [syncActiveSnapshot])

  const updateActiveImageAdjust = useCallback((patch: Partial<AdjustParams>) => {
    const c = getCanvas(); if (!c) return
    const obj = c.getActiveObject()
    if (!obj || !isFabricImage(obj)) return
    const current = (obj as FabricImgWithMeta).flimasAdjust || { ...DEFAULT_ADJUST }
    const next = { ...current, ...patch }
    ;(obj as FabricImgWithMeta).flimasAdjust = next
    obj.filters = buildFilters(next)
    obj.applyFilters()
    c.requestRenderAll()
    handleChangeRef.current()
    syncActiveSnapshot()
  }, [syncActiveSnapshot])

  const resetActiveAdjust = useCallback(() => updateActiveImageAdjust({ ...DEFAULT_ADJUST }), [updateActiveImageAdjust])

  // ── Layers actions ─────────────────────────────────────
  const selectLayer = useCallback((obj: fabric.Object) => {
    const c = getCanvas(); if (!c) return
    c.setActiveObject(obj)
    c.requestRenderAll()
    syncActiveSnapshot()
  }, [syncActiveSnapshot])

  const toggleLayerVisibility = useCallback((obj: fabric.Object) => {
    obj.visible = !obj.visible
    const c = getCanvas(); c?.requestRenderAll()
    handleChangeRef.current()
  }, [])

  const toggleLayerLock = useCallback((obj: fabric.Object) => {
    const locked = !(obj.selectable === false && obj.evented === false)
    obj.selectable = !locked
    obj.evented = !locked
    refreshLayers()
    const c = getCanvas(); c?.requestRenderAll()
  }, [refreshLayers])

  const setLayerOpacity = useCallback((obj: fabric.Object, value: number) => {
    obj.opacity = value
    const c = getCanvas(); c?.requestRenderAll()
    handleChangeRef.current()
  }, [])

  const moveLayer = useCallback((obj: fabric.Object, dir: 'up' | 'down' | 'top' | 'bottom') => {
    const c = getCanvas(); if (!c) return
    if (dir === 'up') c.bringObjectForward(obj)
    else if (dir === 'down') c.sendObjectBackwards(obj)
    else if (dir === 'top') c.bringObjectToFront(obj)
    else c.sendObjectToBack(obj)
    c.requestRenderAll()
    handleChangeRef.current()
  }, [])

  const deleteLayer = useCallback((obj: fabric.Object) => {
    const c = getCanvas(); if (!c) return
    c.remove(obj)
    c.discardActiveObject()
    c.requestRenderAll()
  }, [])

  const renameLayer = useCallback((obj: fabric.Object, name: string) => {
    (obj as FabricObjWithMeta).flimasName = name
    refreshLayers()
    handleChangeRef.current()
  }, [refreshLayers])

  const setLayerBlendMode = useCallback((obj: fabric.Object, mode: GlobalCompositeOperation) => {
    obj.globalCompositeOperation = mode
    const c = getCanvas(); c?.requestRenderAll()
    handleChangeRef.current()
  }, [])

  // ── Canvas-level ───────────────────────────────────────
  const setCanvasDimensions = useCallback((w: number, h: number) => {
    const clamp = (v: number) => Math.max(16, Math.min(8000, Math.round(v) || 16))
    setCanvasSize({ width: clamp(w), height: clamp(h) })
    handleChangeRef.current()
  }, [])

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onImportImage={importImageFromFile}
        onUndo={doUndo}
        onRedo={doRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomFit={zoomFit}
        onZoomReset={zoomReset}
        zoomPercent={Math.round(zoom * 100)}
        onExport={doExport}
        onClear={clearAll}
      />

      <CanvasArea
        width={canvasSize.width}
        height={canvasSize.height}
        background={background}
        darkMode={darkMode}
        readOnly={readOnly}
        onInit={handleInit}
        onImageDrop={onDropImage}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <PropertiesPanel
        activeTool={activeTool}
        active={activeSnapshot}
        brushColor={brushColor} setBrushColor={setBrushColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        fontFamily={fontFamily} setFontFamily={setFontFamily}
        fontSize={fontSize} setFontSize={setFontSize}
        layers={layers}
        onSelectLayer={selectLayer}
        onToggleLayerVisibility={toggleLayerVisibility}
        onToggleLayerLock={toggleLayerLock}
        onSetLayerOpacity={setLayerOpacity}
        onMoveLayer={moveLayer}
        onDeleteLayer={deleteLayer}
        onRenameLayer={renameLayer}
        onSetLayerBlendMode={setLayerBlendMode}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        onCanvasSize={setCanvasDimensions}
        background={background}
        onBackgroundChange={(bg) => { setBackground(bg); setTimeout(() => handleChangeRef.current(), 0) }}
        onMutateActive={mutateActive}
        onUpdateAdjust={updateActiveImageAdjust}
        onResetAdjust={resetActiveAdjust}
        fileId={fileId}
      />
    </div>
  )
}

// ── Helpers externos ──────────────────────────────────────
export interface LayerInfo {
  idx: number
  name: string
  type: string
  visible: boolean
  locked: boolean
  opacity: number
  isImage: boolean
  ref: fabric.Object
}

export interface ActiveSnapshot {
  type: string
  isImage: boolean
  isText: boolean
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  textAlign: string
  adjust: AdjustParams
  blendMode: GlobalCompositeOperation
  shadow: string | null
}

interface FabricObjWithMeta extends fabric.Object { flimasName?: string; flimasKind?: string }
interface FabricImgWithMeta extends fabric.FabricImage { flimasAdjust?: AdjustParams; flimasName?: string }

function defaultLayerName(o: fabric.Object): string {
  switch (o.type) {
    case 'image': return 'Imagem'
    case 'i-text': case 'text': case 'textbox': return 'Texto'
    case 'rect': return 'Retângulo'
    case 'ellipse': case 'circle': return 'Elipse'
    case 'triangle': return 'Triângulo'
    case 'line': return 'Linha'
    case 'path': return 'Traço'
    case 'group': return 'Grupo'
    default: return o.type || 'Objeto'
  }
}

function snapshotFromObject(obj: fabric.Object): ActiveSnapshot {
  const isText = obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox'
  const isImage = obj.type === 'image'
  const t = obj as fabric.IText
  const img = obj as FabricImgWithMeta
  const adjust = (img.flimasAdjust as AdjustParams) || { ...DEFAULT_ADJUST }
  return {
    type: obj.type || 'object',
    isImage,
    isText,
    fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
    stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
    strokeWidth: obj.strokeWidth ?? 0,
    opacity: obj.opacity ?? 1,
    fontFamily: isText ? (t.fontFamily || 'sans-serif') : '',
    fontSize: isText ? (t.fontSize || 40) : 40,
    bold: isText && t.fontWeight === 'bold',
    italic: isText && t.fontStyle === 'italic',
    underline: isText && !!t.underline,
    textAlign: isText ? (t.textAlign || 'left') : 'left',
    adjust,
    blendMode: (obj.globalCompositeOperation as GlobalCompositeOperation) || 'source-over',
    shadow: obj.shadow ? String(obj.shadow) : null,
  }
}

async function loadImageIntoCanvas(c: fabric.Canvas, dataUrl: string): Promise<void> {
  try {
    const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
    // Escala para caber no canvas se for grande
    const maxW = c.getWidth() * 0.9
    const maxH = c.getHeight() * 0.9
    const sx = maxW / (img.width || maxW)
    const sy = maxH / (img.height || maxH)
    const s = Math.min(sx, sy, 1)
    img.scale(s)
    img.set({ left: c.getWidth() / 2, top: c.getHeight() / 2, originX: 'center', originY: 'center' })
    ;(img as FabricImgWithMeta).flimasAdjust = { ...DEFAULT_ADJUST }
    ;(img as FabricImgWithMeta).flimasName = 'Imagem'
    c.add(img)
    c.setActiveObject(img)
    c.requestRenderAll()
  } catch (e) {
    console.error('Falha ao carregar imagem', e)
  }
}
