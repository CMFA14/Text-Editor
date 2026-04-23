import { emptyWorkbook, type UniverWorkbookData, type UniverCellData } from '../utils/sheetSchema'

export interface SheetTemplate {
  id: string
  name: string
  icon: string
  description: string
  build: () => UniverWorkbookData
}

function cellsFromAOA(aoa: (string | number | { f: string; v?: string | number } | null)[][]): Record<number, Record<number, UniverCellData>> {
  const out: Record<number, Record<number, UniverCellData>> = {}
  aoa.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val === null || val === undefined || val === '') return
      if (!out[r]) out[r] = {}
      if (typeof val === 'object') {
        out[r][c] = { f: val.f, v: val.v ?? 0 }
      } else {
        out[r][c] = { v: val }
      }
    })
  })
  return out
}

function buildFromAOA(name: string, aoa: (string | number | { f: string; v?: string | number } | null)[][]): UniverWorkbookData {
  const wb = emptyWorkbook(name)
  const sheetId = wb.sheetOrder[0]
  wb.sheets[sheetId].cellData = cellsFromAOA(aoa)
  wb.sheets[sheetId].rowCount = Math.max(100, aoa.length + 10)
  wb.sheets[sheetId].columnCount = Math.max(26, (aoa[0]?.length ?? 0) + 5)
  return wb
}

export const SHEET_TEMPLATES: SheetTemplate[] = [
  {
    id: 'blank',
    name: 'Em branco',
    icon: '📊',
    description: 'Planilha vazia',
    build: () => emptyWorkbook('Nova Planilha'),
  },
  {
    id: 'budget',
    name: 'Orçamento doméstico',
    icon: '💰',
    description: 'Controle de receitas e despesas mensais',
    build: () => buildFromAOA('Orçamento', [
      ['Categoria', 'Previsto', 'Realizado', 'Diferença'],
      ['Salário', 5000, 5000, { f: '=C2-B2' }],
      ['Aluguel', -1500, -1500, { f: '=C3-B3' }],
      ['Mercado', -800, 0, { f: '=C4-B4' }],
      ['Transporte', -300, 0, { f: '=C5-B5' }],
      ['Lazer', -200, 0, { f: '=C6-B6' }],
      ['Total', { f: '=SUM(B2:B6)' }, { f: '=SUM(C2:C6)' }, { f: '=SUM(D2:D6)' }],
    ]),
  },
  {
    id: 'contacts',
    name: 'Lista de contatos',
    icon: '👥',
    description: 'Base simples de contatos',
    build: () => buildFromAOA('Contatos', [
      ['Nome', 'Telefone', 'Email', 'Empresa', 'Observações'],
      ['', '', '', '', ''],
    ]),
  },
  {
    id: 'schedule',
    name: 'Cronograma',
    icon: '📅',
    description: 'Planejamento por semana',
    build: () => buildFromAOA('Cronograma', [
      ['Tarefa', 'Início', 'Fim', 'Responsável', 'Status'],
      ['Exemplo', '01/01/2026', '05/01/2026', 'Fulano', 'Em andamento'],
    ]),
  },
  {
    id: 'invoice',
    name: 'Controle financeiro',
    icon: '🧮',
    description: 'Entradas e saídas com totais',
    build: () => buildFromAOA('Financeiro', [
      ['Data', 'Descrição', 'Categoria', 'Valor'],
      ['', '', '', ''],
      ['', '', 'Total', { f: '=SUM(D2:D100)' }],
    ]),
  },
]
