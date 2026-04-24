export interface UniverCellData {
  v?: string | number | boolean | null
  f?: string
}

export interface UniverSheetData {
  id: string
  name: string
  tabColor: string
  hidden: number
  rowCount: number
  columnCount: number
  cellData: Record<number, Record<number, UniverCellData>>
  freeze?: { xSplit: number; ySplit: number; startRow: number; startColumn: number }
  mergeData?: unknown[]
}

export interface UniverWorkbookData {
  id: string
  name: string
  appVersion: string
  locale: string
  styles: Record<string, unknown>
  sheetOrder: string[]
  sheets: Record<string, UniverSheetData>
  resources: unknown[]
}

export function emptySheet(id: string, name: string, rows = 100, cols = 26): UniverSheetData {
  return {
    id,
    name,
    tabColor: '',
    hidden: 0,
    rowCount: rows,
    columnCount: cols,
    cellData: {},
    freeze: { xSplit: 0, ySplit: 0, startRow: -1, startColumn: -1 },
    mergeData: [],
  }
}

export function emptyWorkbook(name = 'Planilha'): UniverWorkbookData {
  const sheetId = 'sheet-1'
  return {
    id: `wb-${Date.now()}`,
    name,
    appVersion: '3.0.0-alpha',
    locale: 'enUS',
    styles: {},
    sheetOrder: [sheetId],
    sheets: { [sheetId]: emptySheet(sheetId, 'Página1') },
    resources: [],
  }
}

export function parseWorkbookJson(raw: string): UniverWorkbookData {
  if (!raw) return emptyWorkbook()
  try {
    const parsed = JSON.parse(raw) as UniverWorkbookData
    if (parsed && parsed.sheetOrder && parsed.sheets) return parsed
  } catch {
    // ignore
  }
  return emptyWorkbook()
}
