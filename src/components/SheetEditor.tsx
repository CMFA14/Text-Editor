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
      darkMode,
      presets: [
        UniverSheetsCorePreset({
          container,
        }),
      ],
    } as never)

    const workbook = univerAPI.createWorkbook(workbookData as never)

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
    <main className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-app)] transition-colors duration-500">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: 'calc(100vh - 72px)' }}
        data-dark={darkMode ? 'true' : 'false'}
      />
    </main>
  )
}
