/**
 * Headless rasterization of a Flimas Studio document.
 *
 * The Studio stores the canvas as JSON. To let the Dashboard offer PNG/JPEG/PDF
 * downloads without opening the editor, we rebuild the scene in a StaticCanvas
 * (off-screen), render once, and hand back a dataURL.
 */
import * as fabric from 'fabric'

interface StoredDoc {
  version: number
  width: number
  height: number
  background: string
  canvas: unknown
}

interface AdjustParams {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  preset: string
}

type FabricImageLike = fabric.FabricImage & { flimasAdjust?: AdjustParams }

function parseDoc(raw: string): StoredDoc | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDoc>
    if (
      parsed && typeof parsed === 'object'
      && 'canvas' in parsed && 'width' in parsed && 'height' in parsed
    ) {
      return parsed as StoredDoc
    }
    return null
  } catch {
    return null
  }
}

function isFabricImage(obj: fabric.Object): obj is fabric.FabricImage {
  return obj.type === 'image' || obj instanceof fabric.FabricImage
}

function buildFilters(p: AdjustParams): fabric.filters.BaseFilter<string>[] {
  const out: fabric.filters.BaseFilter<string>[] = []
  if (p.brightness) out.push(new fabric.filters.Brightness({ brightness: p.brightness }))
  if (p.contrast)   out.push(new fabric.filters.Contrast({ contrast: p.contrast }))
  if (p.saturation) out.push(new fabric.filters.Saturation({ saturation: p.saturation }))
  if (p.hue)        out.push(new fabric.filters.HueRotation({ rotation: p.hue }))
  if (p.blur > 0)   out.push(new fabric.filters.Blur({ blur: p.blur }))
  switch (p.preset) {
    case 'grayscale':   out.push(new fabric.filters.Grayscale()); break
    case 'sepia':       out.push(new fabric.filters.Sepia()); break
    case 'invert':      out.push(new fabric.filters.Invert()); break
    case 'vintage':     out.push(new fabric.filters.Vintage()); break
    case 'kodachrome':  out.push(new fabric.filters.Kodachrome()); break
    case 'polaroid':    out.push(new fabric.filters.Polaroid()); break
    case 'bw':          out.push(new fabric.filters.BlackWhite()); break
    case 'brownie':     out.push(new fabric.filters.Brownie()); break
    case 'technicolor': out.push(new fabric.filters.Technicolor()); break
  }
  return out
}

/**
 * Rasterize a stored Flimas image document to a dataURL.
 * `format` is the output image format; `quality` only applies to JPEG/WebP.
 */
export async function rasterizeFlimasImage(
  rawContent: string,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality = 0.92,
): Promise<string | null> {
  const doc = parseDoc(rawContent)
  if (!doc) return null

  const w = Math.max(16, Math.round(doc.width || 1200))
  const h = Math.max(16, Math.round(doc.height || 800))

  const el = document.createElement('canvas')
  el.width = w
  el.height = h

  const scene = new fabric.StaticCanvas(el, {
    width: w,
    height: h,
    backgroundColor: doc.background || '#ffffff',
    enableRetinaScaling: false,
  })

  try {
    await scene.loadFromJSON(doc.canvas as object)
    // Re-apply non-destructive filter pipeline stored on images
    scene.getObjects().forEach(o => {
      if (isFabricImage(o)) {
        const adj = (o as FabricImageLike).flimasAdjust
        if (adj) {
          ;(o as fabric.FabricImage).filters = buildFilters(adj)
          ;(o as fabric.FabricImage).applyFilters()
        }
      }
    })
    scene.renderAll()

    const dataUrl = scene.toDataURL({
      format,
      quality,
      multiplier: 1,
      enableRetinaScaling: false,
    })
    return dataUrl
  } catch (err) {
    console.error('Falha ao rasterizar imagem', err)
    return null
  } finally {
    scene.dispose()
  }
}

/**
 * Render the doc straight to a PDF using html2pdf (lazy-loaded).
 */
export async function rasterizeFlimasImageToPdfBlob(
  rawContent: string,
  filename = 'flimas-image.pdf',
): Promise<void> {
  const doc = parseDoc(rawContent)
  if (!doc) return
  const w = Math.max(16, Math.round(doc.width || 1200))
  const h = Math.max(16, Math.round(doc.height || 800))

  const dataUrl = await rasterizeFlimasImage(rawContent, 'png', 1)
  if (!dataUrl) return

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
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'px', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait' },
      })
      .save()
  } finally {
    holder.remove()
  }
}

// Convenience: trigger a download from a dataURL
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
