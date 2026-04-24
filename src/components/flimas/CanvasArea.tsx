import { useEffect, useRef } from 'react'
import * as fabric from 'fabric'

interface CanvasAreaProps {
  width: number
  height: number
  background: string
  darkMode: boolean
  readOnly: boolean
  onInit: (canvas: fabric.Canvas) => void
  onDispose?: () => void
  onImageDrop?: (dataUrl: string) => void
  zoom: number              // 1 = 100%
  onZoomChange: (z: number) => void
}

/**
 * Wrapper que hospeda a instância fabric.Canvas com:
 *  - zoom/pan persistido via viewportTransform
 *  - pan com Alt/botão-meio
 *  - drop de imagem
 *  - readOnly desliga interação
 */
export default function CanvasArea({
  width, height, background, darkMode, readOnly,
  onInit, onDispose, onImageDrop, zoom, onZoomChange,
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const onInitRef = useRef(onInit)
  const onDisposeRef = useRef(onDispose)
  const onZoomRef = useRef(onZoomChange)
  const onDropRef = useRef(onImageDrop)

  useEffect(() => { onInitRef.current = onInit }, [onInit])
  useEffect(() => { onDisposeRef.current = onDispose }, [onDispose])
  useEffect(() => { onZoomRef.current = onZoomChange }, [onZoomChange])
  useEffect(() => { onDropRef.current = onImageDrop }, [onImageDrop])

  // Init uma única vez
  useEffect(() => {
    if (!canvasElRef.current) return
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: background,
      preserveObjectStacking: true,
      selection: true,
    })
    fabricRef.current = canvas
    onInitRef.current(canvas)

    // ── Pan com Alt ou botão do meio ──────────────
    type State = { dragging: boolean; lastX: number; lastY: number }
    const state: State = { dragging: false, lastX: 0, lastY: 0 }

    canvas.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent
      if (e.altKey || e.button === 1) {
        state.dragging = true
        state.lastX = e.clientX
        state.lastY = e.clientY
        canvas.selection = false
        canvas.defaultCursor = 'grabbing'
        canvas.setCursor('grabbing')
      }
    })
    canvas.on('mouse:move', (opt) => {
      if (!state.dragging) return
      const e = opt.e as MouseEvent
      const vpt = canvas.viewportTransform
      if (!vpt) return
      vpt[4] += e.clientX - state.lastX
      vpt[5] += e.clientY - state.lastY
      state.lastX = e.clientX
      state.lastY = e.clientY
      canvas.requestRenderAll()
    })
    canvas.on('mouse:up', () => {
      if (!state.dragging) return
      state.dragging = false
      canvas.selection = true
      canvas.defaultCursor = 'default'
      canvas.setCursor('default')
    })

    // ── Zoom com Ctrl/Cmd + wheel ─────────────────
    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY
      let newZoom = canvas.getZoom() * (0.999 ** delta)
      newZoom = Math.max(0.1, Math.min(8, newZoom))
      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), newZoom)
      onZoomRef.current(newZoom)
    })

    return () => {
      onDisposeRef.current?.()
      canvas.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tamanho do canvas
  useEffect(() => {
    const c = fabricRef.current
    if (!c) return
    c.setDimensions({ width, height })
    c.requestRenderAll()
  }, [width, height])

  // Cor de fundo (pode ser 'transparent')
  useEffect(() => {
    const c = fabricRef.current
    if (!c) return
    if (background === 'transparent') {
      c.backgroundColor = ''
    } else {
      c.backgroundColor = background
    }
    c.requestRenderAll()
  }, [background])

  // Zoom externo (toolbar: fit, 100%, in, out)
  useEffect(() => {
    const c = fabricRef.current
    if (!c) return
    if (Math.abs(c.getZoom() - zoom) < 0.001) return
    const center = new fabric.Point(c.getWidth() / 2, c.getHeight() / 2)
    c.zoomToPoint(center, zoom)
    c.requestRenderAll()
  }, [zoom])

  // ReadOnly
  useEffect(() => {
    const c = fabricRef.current
    if (!c) return
    c.selection = !readOnly
    c.skipTargetFind = readOnly
    c.forEachObject(o => { o.selectable = !readOnly; o.evented = !readOnly })
    c.requestRenderAll()
  }, [readOnly])

  // Drop de imagem
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      const img = Array.from(files).find(f => f.type.startsWith('image/'))
      if (!img) return
      e.preventDefault()
      const reader = new FileReader()
      reader.onload = () => onDropRef.current?.(String(reader.result || ''))
      reader.readAsDataURL(img)
    }
    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('drop', onDrop)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-auto ${darkMode ? 'bg-slate-950' : 'bg-slate-200'} custom-scrollbar relative`}
      style={{ backgroundImage: 'radial-gradient(circle, rgba(120,120,140,0.12) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
    >
      <div className="min-w-full min-h-full flex items-center justify-center p-12">
        <div
          className="shadow-2xl rounded-sm ring-1 ring-black/10 relative"
          style={{
            backgroundColor: background === 'transparent' ? undefined : background,
            backgroundImage: background === 'transparent'
              ? 'linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%)'
              : undefined,
            backgroundSize: background === 'transparent' ? '16px 16px' : undefined,
            backgroundPosition: background === 'transparent' ? '0 0, 0 8px, 8px -8px, -8px 0px' : undefined,
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  )
}
