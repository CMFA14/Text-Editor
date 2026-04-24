import React, { useEffect, useRef } from 'react'
import * as fabric from 'fabric'

interface CanvasAreaProps {
  onInit: (canvas: fabric.Canvas) => void
  readOnly?: boolean
  darkMode?: boolean
}

export default function CanvasArea({ onInit, readOnly, darkMode }: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1024,
      height: 768,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      isDrawingMode: false,
      selection: !readOnly,
    })

    fabricRef.current = canvas
    onInit(canvas)

    // Zoom and Pan
    canvas.on('mouse:wheel', function(this: any, opt: any) {
      var delta = opt.e.deltaY;
      var zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.05) zoom = 0.05;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('mouse:down', function(this: any, opt: any) {
      var evt = opt.e;
      if (evt.altKey) {
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
       style={{ minWidth: 1024, minHeight: 768 }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
