import React, { useEffect, useRef } from 'react'
import * as fabric from 'fabric'

interface CanvasAreaProps {
  onInit: (canvas: fabric.Canvas) => void
  readOnly?: boolean
  darkMode?: boolean
  canvasWidth?: number
  canvasHeight?: number
}

export default function CanvasArea({ onInit, readOnly, darkMode, canvasWidth = 1024, canvasHeight = 768 }: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      isDrawingMode: false,
      selection: !readOnly,
    })

    fabricRef.current = canvas
    onInit(canvas)

    // Fit to container initial zoom
    const fitToContainer = () => {
      const padding = 60
      const scaleX = (containerRef.current!.clientWidth - padding) / canvas.width
      const scaleY = (containerRef.current!.clientHeight - padding) / canvas.height
      const scale = Math.min(scaleX, scaleY, 1)
      
      canvas.setZoom(scale)
      const center = canvas.getCenter()
      canvas.absolutePan({ 
        x: (canvas.width * scale - containerRef.current!.clientWidth) / 2 + (center.left * scale), 
        y: (canvas.height * scale - containerRef.current!.clientHeight) / 2 + (center.top * scale)
      })
    }

    setTimeout(fitToContainer, 100)

    // Zoom and Pan
    canvas.on('mouse:wheel', function(this: any, opt: any) {
      if (!opt.e.ctrlKey && !opt.e.altKey) return // Apenas zoom com modificador ou se desejar livre
      var delta = opt.e.deltaY;
      var zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('mouse:down', function(this: any, opt: any) {
      var evt = opt.e;
      if (evt.altKey || evt.button === 1) { // Alt ou botão do meio
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', function(this: any, opt: any) {
      if (this.isDragging) {
        var e = opt.e;
        var vpt = this.viewportTransform;
        if (vpt) {
           vpt[4] += e.clientX - this.lastPosX;
           vpt[5] += e.clientY - this.lastPosY;
           this.requestRenderAll();
        }
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    canvas.on('mouse:up', function(this: any, opt: any) {
      if (this.isDragging) {
         if (this.viewportTransform) this.setViewportTransform(this.viewportTransform);
         this.isDragging = false;
         this.selection = !readOnly;
      }
    });

    return () => {
      canvas.off()
      canvas.dispose()
    }
  }, []) // Empty dep array to init once

  // React to theme change
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = darkMode ? '#1e293b' : '#ffffff'
      fabricRef.current.renderAll()
    }
  }, [darkMode])

  // React to dimensions change
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width: canvasWidth, height: canvasHeight })
      fabricRef.current.renderAll()
    }
  }, [canvasWidth, canvasHeight])

  // React to readOnly
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.selection = !readOnly
      fabricRef.current.getObjects().forEach(obj => {
         obj.selectable = !readOnly
         obj.evented = !readOnly
      })
    }
  }, [readOnly])

  return (
    <div 
       ref={containerRef} 
       className="shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
       style={{ maxWidth: '100%' }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
