import type { FileEntry, CodeLanguage } from '../types'

/**
 * Helpers para download direto a partir da Dashboard (sem abrir o editor).
 * Cada função retorna uma lista de formatos disponíveis para a `FileEntry`
 * e uma função de execução do download.
 */

export interface DownloadOption {
  id: string
  label: string
  hint?: string
  accent?: 'violet' | 'emerald' | 'sky' | 'pink' | 'rose' | 'slate'
  run: () => void | Promise<void>
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function safeName(title: string, ext: string) {
  const base = (title || 'arquivo').replace(/[\/\\?%*:|"<>]+/g, '_').trim() || 'arquivo'
  return `${base}.${ext}`
}

function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n')
}

function htmlToMarkdownBasic(html: string): string {
  // conversão rudimentar — para docs simples
  const div = document.createElement('div')
  div.innerHTML = html
  const walk = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent || ''
    if (n.nodeType !== Node.ELEMENT_NODE) return ''
    const el = n as HTMLElement
    const tag = el.tagName.toLowerCase()
    const kids = Array.from(el.childNodes).map(walk).join('')
    switch (tag) {
      case 'h1': return `# ${kids}\n\n`
      case 'h2': return `## ${kids}\n\n`
      case 'h3': return `### ${kids}\n\n`
      case 'h4': return `#### ${kids}\n\n`
      case 'p':  return `${kids}\n\n`
      case 'strong': case 'b': return `**${kids}**`
      case 'em': case 'i': return `*${kids}*`
      case 'u': return `__${kids}__`
      case 'code': return `\`${kids}\``
      case 'a': return `[${kids}](${el.getAttribute('href') || ''})`
      case 'br': return '\n'
      case 'hr': return '\n---\n\n'
      case 'li': return `- ${kids}\n`
      case 'ul': case 'ol': return `${kids}\n`
      default: return kids
    }
  }
  return walk(div).replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

function codeExtension(lang: CodeLanguage): string {
  switch (lang) {
    case 'javascript': return 'js'
    case 'typescript': return 'ts'
    case 'python':     return 'py'
    case 'html':       return 'html'
    case 'css':        return 'css'
    case 'json':       return 'json'
    case 'sql':        return 'sql'
    case 'markdown':   return 'md'
    case 'plaintext':  return 'txt'
    default:           return 'txt'
  }
}

function safeParse<T = unknown>(raw: string): T | null {
  try { return JSON.parse(raw) as T } catch { return null }
}

/**
 * Gera as opções de download para um arquivo a partir do seu `FileEntry`.
 * Para formatos mais pesados (xlsx, pdf exato do doc etc), sinalizamos
 * via `hint` que o usuário obtém melhor resultado abrindo no editor.
 */
export function getDownloadOptions(file: FileEntry): DownloadOption[] {
  const t = file.title || 'arquivo'

  if (file.kind === 'doc') {
    const html = file.content || ''
    return [
      {
        id: 'html',
        label: 'HTML',
        hint: 'Formatação preservada',
        accent: 'violet',
        run: () => triggerDownload(
          new Blob([
            `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${t}</title></head><body>${html}</body></html>`,
          ], { type: 'text/html;charset=utf-8' }),
          safeName(t, 'html'),
        ),
      },
      {
        id: 'md',
        label: 'Markdown',
        hint: 'Estrutura em texto',
        accent: 'slate',
        run: () => triggerDownload(
          new Blob([htmlToMarkdownBasic(html)], { type: 'text/markdown;charset=utf-8' }),
          safeName(t, 'md'),
        ),
      },
      {
        id: 'txt',
        label: 'Texto simples',
        hint: 'Sem formatação',
        accent: 'slate',
        run: () => triggerDownload(
          new Blob([htmlToPlainText(html)], { type: 'text/plain;charset=utf-8' }),
          safeName(t, 'txt'),
        ),
      },
    ]
  }

  if (file.kind === 'sheet') {
    return [
      {
        id: 'flimas-sheet',
        label: '.flimas-sheet',
        hint: 'JSON original (recarregável)',
        accent: 'emerald',
        run: () => triggerDownload(
          new Blob([file.content || '{}'], { type: 'application/json' }),
          safeName(t, 'flimas-sheet.json'),
        ),
      },
      {
        id: 'open-for-xlsx',
        label: 'XLSX / CSV',
        hint: 'Abrir no editor para exportar',
        accent: 'slate',
        run: () => alert('Abra a planilha para exportar em .xlsx ou .csv (os exportadores rodam no editor).'),
      },
    ]
  }

  if (file.kind === 'code') {
    const parsed = safeParse<{ code?: string; language?: CodeLanguage }>(file.content || '')
    const code = parsed?.code ?? (file.content || '')
    const lang = (parsed?.language || 'plaintext') as CodeLanguage
    const ext = codeExtension(lang)
    return [
      {
        id: 'code-native',
        label: `.${ext}`,
        hint: `Código ${lang}`,
        accent: 'sky',
        run: () => triggerDownload(
          new Blob([code], { type: 'text/plain;charset=utf-8' }),
          safeName(t, ext),
        ),
      },
      {
        id: 'code-txt',
        label: 'Texto simples',
        hint: 'Como .txt',
        accent: 'slate',
        run: () => triggerDownload(
          new Blob([code], { type: 'text/plain;charset=utf-8' }),
          safeName(t, 'txt'),
        ),
      },
    ]
  }

  if (file.kind === 'image') {
    return [
      {
        id: 'flimas-image',
        label: '.flimas-image',
        hint: 'JSON com camadas e filtros',
        accent: 'pink',
        run: () => triggerDownload(
          new Blob([file.content || '{}'], { type: 'application/json' }),
          safeName(t, 'flimas-image.json'),
        ),
      },
      {
        id: 'open-for-png',
        label: 'PNG / JPEG / PDF',
        hint: 'Abrir no editor para exportar',
        accent: 'slate',
        run: () => alert('Abra a imagem no Flimas Studio para exportar como PNG, JPEG, WebP, SVG ou PDF.'),
      },
    ]
  }

  return []
}
