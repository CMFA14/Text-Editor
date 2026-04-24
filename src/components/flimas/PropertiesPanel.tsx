import { useEffect, useState } from 'react'
import type * as fabric from 'fabric'
import type { FlimasTool, ActiveSnapshot, LayerInfo, AdjustParams } from './FlimasEditor'
import {
  Sliders, Layers as LayersIcon, Image as ImageIcon, Settings2, RotateCcw,
  Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'

interface PropertiesPanelProps {
  activeTool: FlimasTool
  active: ActiveSnapshot | null

  brushColor: string
  setBrushColor: (c: string) => void
  brushSize: number
  setBrushSize: (s: number) => void
  fontFamily: string
  setFontFamily: (f: string) => void
  fontSize: number
  setFontSize: (s: number) => void

  layers: LayerInfo[]
  onSelectLayer: (obj: fabric.Object) => void
  onToggleLayerVisibility: (obj: fabric.Object) => void
  onToggleLayerLock: (obj: fabric.Object) => void
  onSetLayerOpacity: (obj: fabric.Object, v: number) => void
  onMoveLayer: (obj: fabric.Object, dir: 'up' | 'down' | 'top' | 'bottom') => void
  onDeleteLayer: (obj: fabric.Object) => void
  onRenameLayer: (obj: fabric.Object, name: string) => void
  onSetLayerBlendMode: (obj: fabric.Object, mode: GlobalCompositeOperation) => void

  canvasWidth: number
  canvasHeight: number
  onCanvasSize: (w: number, h: number) => void
  background: string
  onBackgroundChange: (bg: string) => void

  onMutateActive: (fn: (obj: fabric.Object) => void) => void
  onUpdateAdjust: (patch: Partial<AdjustParams>) => void
  onResetAdjust: () => void

  fileId: string
}

type TabId = 'props' | 'adjust' | 'layers' | 'canvas'

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
]

const PRESETS: { id: AdjustParams['preset']; label: string }[] = [
  { id: 'none',        label: 'Nenhum' },
  { id: 'grayscale',   label: 'P&B' },
  { id: 'sepia',       label: 'Sépia' },
  { id: 'invert',      label: 'Invert' },
  { id: 'vintage',     label: 'Vintage' },
  { id: 'kodachrome',  label: 'Kodachrome' },
  { id: 'polaroid',    label: 'Polaroid' },
  { id: 'bw',          label: 'B/W' },
  { id: 'brownie',     label: 'Brownie' },
  { id: 'technicolor', label: 'Technicolor' },
]

const BLEND_MODES: GlobalCompositeOperation[] = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity',
]

const CANVAS_PRESETS = [
  { label: 'HD 1280×720',     w: 1280, h: 720 },
  { label: 'FullHD 1920×1080', w: 1920, h: 1080 },
  { label: 'Instagram 1080',   w: 1080, h: 1080 },
  { label: 'Story 1080×1920',  w: 1080, h: 1920 },
  { label: 'A4 210×297',       w: 2480, h: 3508 },
  { label: 'Capa FB 820×312',  w: 820,  h: 312  },
]

export default function PropertiesPanel(p: PropertiesPanelProps) {
  const [tab, setTab] = useState<TabId>('props')
  const [wInput, setWInput] = useState(String(p.canvasWidth))
  const [hInput, setHInput] = useState(String(p.canvasHeight))

  useEffect(() => { setWInput(String(p.canvasWidth)) }, [p.canvasWidth])
  useEffect(() => { setHInput(String(p.canvasHeight)) }, [p.canvasHeight])

  const applyCanvasSize = () => {
    const w = Number(wInput) || p.canvasWidth
    const h = Number(hInput) || p.canvasHeight
    p.onCanvasSize(w, h)
  }

  return (
    <div className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-10 shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
        <TabBtn id="props"  tab={tab} setTab={setTab} icon={<Settings2 size={14} />} label="Props" />
        <TabBtn id="adjust" tab={tab} setTab={setTab} icon={<Sliders size={14} />}   label="Ajustes" />
        <TabBtn id="layers" tab={tab} setTab={setTab} icon={<LayersIcon size={14} />} label="Camadas" />
        <TabBtn id="canvas" tab={tab} setTab={setTab} icon={<ImageIcon size={14} />} label="Canvas" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {tab === 'props' && (
          <PropsTab {...p} />
        )}
        {tab === 'adjust' && (
          <AdjustTab active={p.active} onUpdateAdjust={p.onUpdateAdjust} onResetAdjust={p.onResetAdjust} />
        )}
        {tab === 'layers' && (
          <LayersTab
            layers={p.layers}
            onSelectLayer={p.onSelectLayer}
            onToggleLayerVisibility={p.onToggleLayerVisibility}
            onToggleLayerLock={p.onToggleLayerLock}
            onSetLayerOpacity={p.onSetLayerOpacity}
            onMoveLayer={p.onMoveLayer}
            onDeleteLayer={p.onDeleteLayer}
            onRenameLayer={p.onRenameLayer}
            onSetLayerBlendMode={p.onSetLayerBlendMode}
          />
        )}
        {tab === 'canvas' && (
          <CanvasTab
            canvasWidth={p.canvasWidth}
            canvasHeight={p.canvasHeight}
            wInput={wInput} setWInput={setWInput}
            hInput={hInput} setHInput={setHInput}
            applyCanvasSize={applyCanvasSize}
            background={p.background}
            onBackgroundChange={p.onBackgroundChange}
          />
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
function TabBtn({ id, tab, setTab, icon, label }: {
  id: TabId; tab: TabId; setTab: (t: TabId) => void; icon: React.ReactNode; label: string
}) {
  const active = tab === id
  return (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-500 bg-white dark:bg-slate-900'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ── Tab: Propriedades ───────────────────────────────────────
function PropsTab(p: PropertiesPanelProps) {
  const { active, activeTool, onMutateActive } = p
  const isBrushTool = activeTool === 'brush' || activeTool === 'eraser'
  const isTextTool  = activeTool === 'text'
  const showShapeDefaults = ['rect','circle','triangle','line','arrow'].includes(activeTool)

  return (
    <>
      <SectionTitle>Ferramenta</SectionTitle>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
        Ferramenta ativa: <b className="text-pink-600 dark:text-pink-400">{labelForTool(activeTool)}</b>
      </p>

      {(isBrushTool || isTextTool || showShapeDefaults) && (
        <div className="space-y-3">
          <Field label="Cor base">
            <input
              type="color"
              value={p.brushColor}
              onChange={e => p.setBrushColor(e.target.value)}
              className="w-full h-8 rounded cursor-pointer border-0 bg-transparent p-0"
            />
          </Field>
          {isBrushTool && (
            <Field label={`Espessura: ${p.brushSize}px`}>
              <input
                type="range" min={1} max={80}
                value={p.brushSize}
                onChange={e => p.setBrushSize(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </Field>
          )}
          {isTextTool && (
            <>
              <Field label="Fonte">
                <select
                  value={p.fontFamily}
                  onChange={e => p.setFontFamily(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                >
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                </select>
              </Field>
              <Field label={`Tamanho: ${p.fontSize}px`}>
                <input
                  type="range" min={8} max={220}
                  value={p.fontSize}
                  onChange={e => p.setFontSize(Number(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </Field>
            </>
          )}
        </div>
      )}

      <div className="h-px bg-slate-200 dark:bg-slate-800 -mx-4" />

      <SectionTitle>Objeto selecionado</SectionTitle>

      {!active && (
        <p className="text-xs text-slate-400 italic">Nenhum objeto selecionado.</p>
      )}

      {active && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[11px] uppercase font-bold text-slate-400">
            Tipo: <span className="text-slate-700 dark:text-slate-200">{active.type}</span>
          </div>

          <Field label="Preencher">
            <input
              type="color"
              value={active.fill || '#000000'}
              onChange={e => onMutateActive(obj => { obj.set({ fill: e.target.value }) })}
              className="w-full h-8 rounded cursor-pointer border-0 bg-transparent p-0"
            />
          </Field>

          <Field label="Borda">
            <div className="flex gap-2">
              <input
                type="color"
                value={active.stroke || '#000000'}
                onChange={e => onMutateActive(obj => { obj.set({ stroke: e.target.value }) })}
                className="h-8 w-14 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="number" min={0} max={40}
                value={active.strokeWidth}
                onChange={e => onMutateActive(obj => { obj.set({ strokeWidth: Number(e.target.value) }) })}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold"
              />
            </div>
          </Field>

          <Field label={`Opacidade: ${Math.round(active.opacity * 100)}%`}>
            <input
              type="range" min={0} max={1} step={0.01}
              value={active.opacity}
              onChange={e => onMutateActive(obj => { obj.set({ opacity: Number(e.target.value) }) })}
              className="w-full accent-pink-500"
            />
          </Field>

          {active.isText && (
            <div className="space-y-3">
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
              <SectionTitle>Texto</SectionTitle>

              <Field label="Fonte">
                <select
                  value={active.fontFamily}
                  onChange={e => onMutateActive(obj => { (obj as fabric.IText).set({ fontFamily: e.target.value }) })}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm"
                >
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                </select>
              </Field>

              <Field label={`Tamanho: ${active.fontSize}px`}>
                <input
                  type="range" min={8} max={240}
                  value={active.fontSize}
                  onChange={e => onMutateActive(obj => { (obj as fabric.IText).set({ fontSize: Number(e.target.value) }) })}
                  className="w-full accent-pink-500"
                />
              </Field>

              <div className="flex gap-1">
                <SmallToggle active={active.bold}
                  onClick={() => onMutateActive(obj => { (obj as fabric.IText).set({ fontWeight: active.bold ? 'normal' : 'bold' }) })}>
                  <Bold size={14} />
                </SmallToggle>
                <SmallToggle active={active.italic}
                  onClick={() => onMutateActive(obj => { (obj as fabric.IText).set({ fontStyle: active.italic ? 'normal' : 'italic' }) })}>
                  <Italic size={14} />
                </SmallToggle>
                <SmallToggle active={active.underline}
                  onClick={() => onMutateActive(obj => { (obj as fabric.IText).set({ underline: !active.underline }) })}>
                  <Underline size={14} />
                </SmallToggle>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
                <SmallToggle active={active.textAlign === 'left'}
                  onClick={() => onMutateActive(obj => { (obj as fabric.IText).set({ textAlign: 'left' }) })}>
                  <AlignLeft size={14} />
                </SmallToggle>
                <SmallToggle active={active.textAlign === 'center'}
                  onClick={() => onMutateActive(obj => { (obj as fabric.IText).set({ textAlign: 'center' }) })}>
                  <AlignCenter size={14} />
                </SmallToggle>
                <SmallToggle active={active.textAlign === 'right'}
                  onClick={() => onMutateActive(obj => { (obj as fabric.IText).set({ textAlign: 'right' }) })}>
                  <AlignRight size={14} />
                </SmallToggle>
              </div>
            </div>
          )}

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          <Field label="Modo de mesclagem">
            <select
              value={active.blendMode}
              onChange={e => onMutateActive(obj => { obj.globalCompositeOperation = e.target.value as GlobalCompositeOperation })}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs"
            >
              {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
      )}
    </>
  )
}

// ── Tab: Ajustes (filtros da imagem) ───────────────────────
function AdjustTab({
  active, onUpdateAdjust, onResetAdjust,
}: {
  active: ActiveSnapshot | null
  onUpdateAdjust: (patch: Partial<AdjustParams>) => void
  onResetAdjust: () => void
}) {
  if (!active || !active.isImage) {
    return (
      <div className="space-y-3">
        <SectionTitle>Ajustes</SectionTitle>
        <p className="text-xs text-slate-400 italic">
          Selecione uma imagem para aplicar filtros não-destrutivos (brilho, contraste, saturação, preset etc).
        </p>
      </div>
    )
  }

  const adj = active.adjust

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <SectionTitle>Ajustes (imagem)</SectionTitle>
        <button
          onClick={onResetAdjust}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-pink-500"
          title="Resetar ajustes"
        >
          <RotateCcw size={12} /> reset
        </button>
      </div>

      <SliderField label="Brilho" value={adj.brightness} min={-1} max={1} step={0.01}
        onChange={v => onUpdateAdjust({ brightness: v })} display={v => v.toFixed(2)} />

      <SliderField label="Contraste" value={adj.contrast} min={-1} max={1} step={0.01}
        onChange={v => onUpdateAdjust({ contrast: v })} display={v => v.toFixed(2)} />

      <SliderField label="Saturação" value={adj.saturation} min={-1} max={1} step={0.01}
        onChange={v => onUpdateAdjust({ saturation: v })} display={v => v.toFixed(2)} />

      <SliderField label="Matiz (hue)" value={adj.hue} min={-1} max={1} step={0.01}
        onChange={v => onUpdateAdjust({ hue: v })} display={v => v.toFixed(2)} />

      <SliderField label="Desfoque" value={adj.blur} min={0} max={1} step={0.01}
        onChange={v => onUpdateAdjust({ blur: v })} display={v => v.toFixed(2)} />

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Preset</label>
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map(pr => (
            <button
              key={pr.id}
              onClick={() => onUpdateAdjust({ preset: pr.id })}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                adj.preset === pr.id
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-pink-300'
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Camadas ───────────────────────────────────────────
function LayersTab({
  layers, onSelectLayer, onToggleLayerVisibility, onToggleLayerLock,
  onSetLayerOpacity, onMoveLayer, onDeleteLayer, onRenameLayer, onSetLayerBlendMode,
}: {
  layers: LayerInfo[]
  onSelectLayer: (o: fabric.Object) => void
  onToggleLayerVisibility: (o: fabric.Object) => void
  onToggleLayerLock: (o: fabric.Object) => void
  onSetLayerOpacity: (o: fabric.Object, v: number) => void
  onMoveLayer: (o: fabric.Object, d: 'up' | 'down' | 'top' | 'bottom') => void
  onDeleteLayer: (o: fabric.Object) => void
  onRenameLayer: (o: fabric.Object, n: string) => void
  onSetLayerBlendMode: (o: fabric.Object, mode: GlobalCompositeOperation) => void
}) {
  return (
    <div className="space-y-3">
      <SectionTitle>Camadas ({layers.length})</SectionTitle>
      {layers.length === 0 && (
        <p className="text-xs text-slate-400 italic">Canvas vazio. Use o pincel, texto, forma ou importe uma imagem.</p>
      )}
      <div className="space-y-1.5">
        {layers.map(l => (
          <LayerRow
            key={`${l.idx}-${l.name}`}
            layer={l}
            onSelectLayer={onSelectLayer}
            onToggleLayerVisibility={onToggleLayerVisibility}
            onToggleLayerLock={onToggleLayerLock}
            onSetLayerOpacity={onSetLayerOpacity}
            onMoveLayer={onMoveLayer}
            onDeleteLayer={onDeleteLayer}
            onRenameLayer={onRenameLayer}
            onSetLayerBlendMode={onSetLayerBlendMode}
          />
        ))}
      </div>
    </div>
  )
}

function LayerRow({
  layer, onSelectLayer, onToggleLayerVisibility, onToggleLayerLock,
  onSetLayerOpacity, onMoveLayer, onDeleteLayer, onRenameLayer, onSetLayerBlendMode,
}: {
  layer: LayerInfo
  onSelectLayer: (o: fabric.Object) => void
  onToggleLayerVisibility: (o: fabric.Object) => void
  onToggleLayerLock: (o: fabric.Object) => void
  onSetLayerOpacity: (o: fabric.Object, v: number) => void
  onMoveLayer: (o: fabric.Object, d: 'up' | 'down' | 'top' | 'bottom') => void
  onDeleteLayer: (o: fabric.Object) => void
  onRenameLayer: (o: fabric.Object, n: string) => void
  onSetLayerBlendMode: (o: fabric.Object, mode: GlobalCompositeOperation) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(layer.name)
  const [open, setOpen] = useState(false)

  useEffect(() => setName(layer.name), [layer.name])

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button onClick={() => onToggleLayerVisibility(layer.ref)} className="p-1 text-slate-500 hover:text-pink-500" title={layer.visible ? 'Ocultar' : 'Mostrar'}>
          {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button onClick={() => onToggleLayerLock(layer.ref)} className="p-1 text-slate-500 hover:text-pink-500" title={layer.locked ? 'Destravar' : 'Travar'}>
          {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>

        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => { setEditing(false); if (name.trim()) onRenameLayer(layer.ref, name.trim()) }}
            onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() } }}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs"
          />
        ) : (
          <button
            onClick={() => onSelectLayer(layer.ref)}
            onDoubleClick={() => setEditing(true)}
            className="flex-1 text-left truncate font-semibold text-slate-700 dark:text-slate-200"
            title={`${layer.name} (duplo-clique p/ renomear)`}
          >
            {layer.name}
          </button>
        )}

        <button onClick={() => setOpen(o => !o)} className="p-1 text-slate-400 hover:text-slate-700 text-[10px] font-bold" title="Mais opções">
          {open ? '▴' : '▾'}
        </button>
      </div>

      {open && (
        <div className="px-2 pb-2 space-y-2 border-t border-slate-200 dark:border-slate-700/50 pt-2">
          <div className="flex gap-1">
            <IconBtn onClick={() => onMoveLayer(layer.ref, 'top')} title="Para o topo"><ArrowUpToLine size={12} /></IconBtn>
            <IconBtn onClick={() => onMoveLayer(layer.ref, 'up')} title="Subir"><ArrowUp size={12} /></IconBtn>
            <IconBtn onClick={() => onMoveLayer(layer.ref, 'down')} title="Descer"><ArrowDown size={12} /></IconBtn>
            <IconBtn onClick={() => onMoveLayer(layer.ref, 'bottom')} title="Para o fundo"><ArrowDownToLine size={12} /></IconBtn>
            <div className="flex-1" />
            <IconBtn onClick={() => onDeleteLayer(layer.ref)} title="Excluir camada" danger><Trash2 size={12} /></IconBtn>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Opacidade {Math.round(layer.opacity * 100)}%</label>
            <input
              type="range" min={0} max={1} step={0.01}
              value={layer.opacity}
              onChange={e => onSetLayerOpacity(layer.ref, Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold">Mesclagem</label>
            <select
              defaultValue={(layer.ref.globalCompositeOperation as string) || 'source-over'}
              onChange={e => onSetLayerBlendMode(layer.ref, e.target.value as GlobalCompositeOperation)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-[11px]"
            >
              {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Canvas ────────────────────────────────────────────
function CanvasTab({
  canvasWidth, canvasHeight, wInput, setWInput, hInput, setHInput, applyCanvasSize,
  background, onBackgroundChange,
}: {
  canvasWidth: number
  canvasHeight: number
  wInput: string; setWInput: (v: string) => void
  hInput: string; setHInput: (v: string) => void
  applyCanvasSize: () => void
  background: string
  onBackgroundChange: (bg: string) => void
}) {
  const isTransparent = background === 'transparent'

  return (
    <div className="space-y-5">
      <SectionTitle>Dimensões</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Largura">
          <input
            type="number" min={16} max={8000}
            value={wInput}
            onChange={e => setWInput(e.target.value)}
            onBlur={applyCanvasSize}
            onKeyDown={e => { if (e.key === 'Enter') applyCanvasSize() }}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold"
          />
        </Field>
        <Field label="Altura">
          <input
            type="number" min={16} max={8000}
            value={hInput}
            onChange={e => setHInput(e.target.value)}
            onBlur={applyCanvasSize}
            onKeyDown={e => { if (e.key === 'Enter') applyCanvasSize() }}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold"
          />
        </Field>
      </div>
      <p className="text-[10px] text-slate-400">Atual: {canvasWidth} × {canvasHeight}px</p>

      <div className="space-y-2">
        <label className="text-[11px] uppercase font-bold text-slate-500">Presets</label>
        <div className="grid grid-cols-2 gap-1">
          {CANVAS_PRESETS.map(pr => (
            <button
              key={pr.label}
              onClick={() => { setWInput(String(pr.w)); setHInput(String(pr.h)); setTimeout(() => applyCanvasSize(), 0) }}
              className="px-2 py-1.5 text-[10px] font-semibold rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-pink-400 text-slate-600 dark:text-slate-300"
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-800" />

      <SectionTitle>Fundo</SectionTitle>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={isTransparent ? '#ffffff' : background}
          onChange={e => onBackgroundChange(e.target.value)}
          disabled={isTransparent}
          className="h-8 w-14 rounded cursor-pointer border-0 bg-transparent p-0 disabled:opacity-30"
        />
        <input
          type="text"
          value={background}
          onChange={e => onBackgroundChange(e.target.value)}
          className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onBackgroundChange('#ffffff')}
          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-pink-400"
        >Branco</button>
        <button
          onClick={() => onBackgroundChange('#000000')}
          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-pink-400"
        >Preto</button>
        <button
          onClick={() => onBackgroundChange('transparent')}
          className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border ${
            isTransparent
              ? 'bg-pink-500 text-white border-pink-500'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-pink-400'
          }`}
        >Transp.</button>
      </div>
    </div>
  )
}

// ── Building blocks ─────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">{children}</h3>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">{label}</label>
      {children}
    </div>
  )
}

function SliderField({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display: (v: number) => string
}) {
  return (
    <Field label={`${label}: ${display(value)}`}>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-pink-500"
      />
    </Field>
  )
}

function SmallToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-md flex items-center justify-center border text-xs transition-colors ${
        active
          ? 'bg-pink-500 text-white border-pink-500'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-pink-300'
      }`}
    >
      {children}
    </button>
  )
}

function IconBtn({ onClick, children, title, danger }: { onClick: () => void; children: React.ReactNode; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-md flex items-center justify-center border transition-colors ${
        danger
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-100'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-pink-300 hover:text-pink-500'
      }`}
    >
      {children}
    </button>
  )
}

function labelForTool(t: FlimasTool): string {
  switch (t) {
    case 'select':   return 'Seleção'
    case 'pan':      return 'Mão'
    case 'brush':    return 'Pincel'
    case 'eraser':   return 'Borracha'
    case 'text':     return 'Texto'
    case 'rect':     return 'Retângulo'
    case 'circle':   return 'Elipse'
    case 'triangle': return 'Triângulo'
    case 'line':     return 'Linha'
    case 'arrow':    return 'Seta'
  }
}
