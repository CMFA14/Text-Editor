import * as XLSX from 'xlsx'
import {
  emptySheet,
  emptyWorkbook,
  type UniverCellData,
  type UniverSheetData,
  type UniverWorkbookData,
} from './sheetSchema'

export { emptyWorkbook, parseWorkbookJson } from './sheetSchema'
export type { UniverCellData, UniverSheetData, UniverWorkbookData } from './sheetSchema'

export function xlsxBufferToUniver(buffer: ArrayBuffer, workbookName = 'Planilha'): UniverWorkbookData {
  const wb = XLSX.read(buffer, { type: 'array', cellFormula: true })
  const sheets: Record<string, UniverSheetData> = {}
  const sheetOrder: string[] = []

  wb.SheetNames.forEach((name, index) => {
    const ws = wb.Sheets[name]
    const id = `sheet-${index + 1}`
    sheetOrder.push(id)
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
    const cellData: Record<number, Record<number, UniverCellData>> = {}

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = ws[addr] as XLSX.CellObject | undefined
        if (!cell) continue
        const univerCell: UniverCellData = {}
        if (cell.f) univerCell.f = `=${cell.f.replace(/^=/, '')}`
        if (cell.v !== undefined && cell.v !== null) {
          univerCell.v = typeof cell.v === 'object' ? String(cell.v) : (cell.v as string | number | boolean)
        }
        if (univerCell.v === undefined && !univerCell.f) continue
        if (!cellData[r]) cellData[r] = {}
        cellData[r][c] = univerCell
      }
    }

    const rowCount = Math.max(100, range.e.r + 1)
    const columnCount = Math.max(26, range.e.c + 1)
    sheets[id] = { ...emptySheet(id, name, rowCount, columnCount), cellData }
  })

  if (sheetOrder.length === 0) return emptyWorkbook(workbookName)

  return {
    id: `wb-${Date.now()}`,
    name: workbookName,
    appVersion: '3.0.0-alpha',
    locale: 'enUS',
    styles: {},
    sheetOrder,
    sheets,
    resources: [],
  }
}

export function csvTextToUniver(csv: string, workbookName = 'Planilha'): UniverWorkbookData {
  const wb = XLSX.read(csv, { type: 'string' })
  if (!wb.SheetNames.length) return emptyWorkbook(workbookName)
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return xlsxBufferToUniver(buffer, workbookName)
}

function univerCellsToAOA(sheet: UniverSheetData): (string | number | boolean | null)[][] {
  const rows: (string | number | boolean | null)[][] = []
  const entries = Object.entries(sheet.cellData || {})
  if (entries.length === 0) return [[]]
  const maxRow = Math.max(...entries.map(([r]) => Number(r)))
  for (let r = 0; r <= maxRow; r++) {
    const rowObj = sheet.cellData[r] || {}
    const cols = Object.keys(rowObj).map(Number)
    const maxCol = cols.length ? Math.max(...cols) : 0
    const row: (string | number | boolean | null)[] = []
    for (let c = 0; c <= maxCol; c++) {
      const cell = rowObj[c]
      if (!cell) { row.push(null); continue }
      if (cell.f) {
        row.push(null)
      } else {
        row.push(cell.v ?? null)
      }
    }
    rows.push(row)
  }
  return rows
}

export function universToXlsxBlob(data: UniverWorkbookData): Blob {
  const wb = XLSX.utils.book_new()
  data.sheetOrder.forEach(sid => {
    const sheet = data.sheets[sid]
    if (!sheet) return
    const aoa = univerCellsToAOA(sheet)
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    Object.entries(sheet.cellData || {}).forEach(([rStr, row]) => {
      Object.entries(row).forEach(([cStr, cell]) => {
        if (cell.f) {
          const addr = XLSX.utils.encode_cell({ r: Number(rStr), c: Number(cStr) })
          ws[addr] = { t: 'n', f: cell.f.replace(/^=/, ''), v: cell.v ?? 0 }
        }
      })
    })

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31) || 'Sheet')
  })
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function universToCsvBlob(data: UniverWorkbookData): Blob {
  const firstId = data.sheetOrder[0]
  const sheet = firstId ? data.sheets[firstId] : null
  if (!sheet) return new Blob([''], { type: 'text/csv' })
  const aoa = univerCellsToAOA(sheet)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const csv = XLSX.utils.sheet_to_csv(ws)
  return new Blob([csv], { type: 'text/csv;charset=utf-8' })
}
