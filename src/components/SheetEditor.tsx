import { useEffect, useRef } from 'react'
import { LocaleType, merge, createUniver } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core'
import sheetsCoreEnUS from '@univerjs/presets/preset-sheets-core/locales/en-US'
import '@univerjs/presets/lib/styles/preset-sheets-core.css'

interface SheetEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  onChange: (json: string) => void
}

const EMPTY_WORKBOOK = {
  id: 'workbook-1',
  sheetOrder: ['sheet-1'],
  name: 'Planilha',
  appVersion: '3.0.0-alpha',
  locale: LocaleType.EN_US,
  styles: {},
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Página1',
      rowCount: 100,
      columnCount: 26,
      cellData: {},
    },
  },
  resources: [],
}

function parseWorkbookContent(raw: string): Record<string, unknown> {
  if (!raw) return { ...EMPTY_WORKBOOK }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // fall through to empty
  }
  return { ...EMPTY_WORKBOOK }
}

type Primitive = string | number | boolean | null | undefined
type FormulaArg = Primitive | Primitive[] | Primitive[][]

function flatten(args: FormulaArg[]): Primitive[] {
  const out: Primitive[] = []
  const walk = (v: FormulaArg) => {
    if (Array.isArray(v)) v.forEach(walk)
    else out.push(v)
  }
  args.forEach(walk)
  return out
}

function nums(args: FormulaArg[]): number[] {
  return flatten(args)
    .map(v => {
      if (v === null || v === undefined || v === '') return NaN
      const n = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v)
      return n
    })
    .filter(n => !isNaN(n))
}

function registerPortugueseFormulas(univerAPI: { getFormula: () => { registerFunction: (name: string, fn: (...args: FormulaArg[]) => unknown, desc?: string) => unknown } }) {
  const f = univerAPI.getFormula()
  const tryReg = (name: string, fn: (...args: FormulaArg[]) => unknown, desc: string) => {
    try { f.registerFunction(name, fn, desc) } catch (err) { console.warn(`registerFunction ${name}`, err) }
  }
  tryReg('SOMA', (...args) => nums(args).reduce((a, b) => a + b, 0), 'Soma valores')
  tryReg('MEDIA', (...args) => { const x = nums(args); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0 }, 'Média aritmética')
  tryReg('MÉDIA', (...args) => { const x = nums(args); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0 }, 'Média aritmética')
  tryReg('MAXIMO', (...args) => { const x = nums(args); return x.length ? Math.max(...x) : 0 }, 'Valor máximo')
  tryReg('MÁXIMO', (...args) => { const x = nums(args); return x.length ? Math.max(...x) : 0 }, 'Valor máximo')
  tryReg('MINIMO', (...args) => { const x = nums(args); return x.length ? Math.min(...x) : 0 }, 'Valor mínimo')
  tryReg('MÍNIMO', (...args) => { const x = nums(args); return x.length ? Math.min(...x) : 0 }, 'Valor mínimo')
  tryReg('CONT', (...args) => nums(args).length, 'Conta valores numéricos')
  tryReg('CONTNUM', (...args) => nums(args).length, 'Conta valores numéricos')
  tryReg('CONTVALORES', (...args) => flatten(args).filter(v => v !== null && v !== undefined && v !== '').length, 'Conta valores não vazios')
  tryReg('SE', (cond, a, b) => {
    const truthy = Array.isArray(cond) ? Boolean(flatten([cond])[0]) : Boolean(cond)
    return truthy ? a : b
  }, 'Se condicional')
  tryReg('ARRED', (v, d) => {
    const n = Number(Array.isArray(v) ? flatten([v])[0] : v)
    const digits = Number(Array.isArray(d) ? flatten([d])[0] : d ?? 0)
    if (isNaN(n)) return 0
    const p = Math.pow(10, digits || 0)
    return Math.round(n * p) / p
  }, 'Arredonda número')
  tryReg('ABS', (v) => Math.abs(Number(Array.isArray(v) ? flatten([v])[0] : v) || 0), 'Valor absoluto')
  tryReg('CONCATENAR', (...args) => flatten(args).filter(v => v !== null && v !== undefined).join(''), 'Concatena texto')
  tryReg('MAIUSCULA', (v) => String(Array.isArray(v) ? flatten([v])[0] : v ?? '').toUpperCase(), 'Converte em maiúsculas')
  tryReg('MAIÚSCULA', (v) => String(Array.isArray(v) ? flatten([v])[0] : v ?? '').toUpperCase(), 'Converte em maiúsculas')
  tryReg('MINUSCULA', (v) => String(Array.isArray(v) ? flatten([v])[0] : v ?? '').toLowerCase(), 'Converte em minúsculas')
  tryReg('MINÚSCULA', (v) => String(Array.isArray(v) ? flatten([v])[0] : v ?? '').toLowerCase(), 'Converte em minúsculas')
  tryReg('HOJE', () => {
    const d = new Date()
    const epoch = new Date(1899, 11, 30).getTime()
    return Math.floor((d.getTime() - epoch) / 86400000)
  }, 'Data atual')
  tryReg('AGORA', () => {
    const d = new Date()
    const epoch = new Date(1899, 11, 30).getTime()
    return (d.getTime() - epoch) / 86400000
  }, 'Data e hora atuais')
}

export default function SheetEditor({ fileId, initialContent, darkMode, onChange }: SheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const workbookData = parseWorkbookContent(initialContent)

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: merge({}, sheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container,
        }),
      ],
    })

    const workbook = univerAPI.createWorkbook(workbookData as never)

    registerPortugueseFormulas(univerAPI as never)

    try {
      const api = univerAPI as unknown as { toggleDarkMode?: (v: boolean) => void }
      if (typeof api.toggleDarkMode === 'function') api.toggleDarkMode(darkMode)
    } catch { /* noop */ }

    const disposable = univerAPI.addEvent(univerAPI.Event.SheetValueChanged, () => {
      try {
        const snapshot = workbook.save()
        onChangeRef.current(JSON.stringify(snapshot))
      } catch (err) {
        console.error('Falha ao serializar planilha', err)
      }
    })

    return () => {
      try { disposable?.dispose?.() } catch { /* noop */ }
      try { univer.dispose() } catch { /* noop */ }
      container.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, darkMode])

  return (
    <div
      ref={containerRef}
      className="sheet-editor-container bg-[var(--bg-app)]"
      data-dark={darkMode ? 'true' : 'false'}
      style={{ flex: '1 1 auto', width: '100%', height: 'calc(100vh - 72px)', minHeight: '400px', position: 'relative' }}
    />
  )
}
