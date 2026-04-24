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
  accent?: 'violet' | 'emerald' | 'sky' | 'pink' | 'rose' | 'slate' | 'amber'
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

function codeLabel(lang: CodeLanguage): string {
  switch (lang) {
    case 'javascript': return 'JavaScript'
    case 'typescript': return 'TypeScript'
    case 'python':     return 'Python'
    case 'html':       return 'HTML'
    case 'css':        return 'CSS'
    case 'json':       return 'JSON'
    case 'sql':        return 'SQL'
    case 'markdown':   return 'Markdown'
    case 'plaintext':  return 'Texto puro'
    default:           return 'Texto'
  }
}

function safeParse<T = unknown>(raw: string): T | null {
  try { return JSON.parse(raw) as T } catch { return null }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── PDF helpers via html2pdf (lazy) ──────────────────────────
async function htmlToPdf(innerHtml: string, title: string, mode: 'rich' | 'code' = 'rich') {
  const html2pdfMod = await import('html2pdf.js')
  const html2pdf = (html2pdfMod as { default: (...args: unknown[]) => unknown }).default
  const container = document.createElement('div')
  const css = mode === 'code'
    ? `
      body { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
      pre { white-space: pre-wrap; word-break: break-word; font-size: 11px; line-height: 1.5; margin: 0; padding: 12px; background: #0f172a; color: #e2e8f0; border-radius: 8px; }
    `
    : `
      h1,h2,h3,h4 { color: #0f172a; margin-top: 1.4em; page-break-after: avoid; }
      blockquote { border-left: 4px solid #6366f1; padding: 0.75rem 1.25rem; background: #eff6ff; color: #475569; font-style: italic; border-radius: 0 8px 8px 0; }
      pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 10px; overflow-x: auto; font-family: monospace; font-size: 0.85em; }
      code { background: #f1f5f9; color: #6366f1; padding: 0.15em 0.35em; border-radius: 4px; }
      table { border-collapse: collapse; width: 100%; margin: 1.25em 0; }
      th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
      th { background: #f8fafc; font-weight: bold; }
      img { max-width: 100%; border-radius: 8px; page-break-inside: avoid; }
      p, li { page-break-inside: avoid; }
    `
  container.innerHTML = `
    <div style="font-family: 'Merriweather', Georgia, serif; max-width: 720px; margin: 0 auto; padding: 32px 40px; line-height: 1.7; color: #1e293b;">
      <style>${css}</style>
      ${innerHtml}
    </div>`
  await (html2pdf as (...a: unknown[]) => { set: (o: unknown) => { from: (el: HTMLElement) => { save: () => Promise<void> } } })()
    .set({
      margin: [10, 10, 10, 10],
      filename: safeName(title, 'pdf'),
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(container)
    .save()
}

// Simple HTML-as-.doc trick: Word abre HTML com header Office MS como documento.
function htmlAsWordBlob(html: string, title: string): Blob {
  const full = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
    h1,h2,h3,h4 { font-family: Calibri, Arial, sans-serif; color: #1f3864; }
    blockquote { border-left: 3px solid #7c3aed; padding-left: 12px; color: #475569; }
    code { font-family: Consolas, monospace; background: #f1f5f9; padding: 1px 4px; }
    pre  { font-family: Consolas, monospace; background: #0f172a; color: #e2e8f0; padding: 8px; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #94a3b8; padding: 6px; }
  </style>
</head>
<body>${html}</body>
</html>`
  return new Blob(['\ufeff', full], { type: 'application/msword' })
}

// ──────────────────────────────────────────────────────────────

/**
 * Gera as opções de download para um arquivo a partir do seu `FileEntry`.
 */
export function getDownloadOptions(file: FileEntry): DownloadOption[] {
  const t = file.title || 'arquivo'

  if (file.kind === 'doc') {
    const html = file.content || ''
    return [
      {
        id: 'pdf',
        label: 'PDF',
        hint: 'Pronto para imprimir',
        accent: 'rose',
        run: () => htmlToPdf(html, t, 'rich'),
      },
      {
        id: 'doc',
        label: 'Word (.doc)',
        hint: 'Abre no Microsoft Word',
        accent: 'sky',
        run: () => triggerDownload(htmlAsWordBlob(html, t), safeName(t, 'doc')),
      },
      {
        id: 'html',
        label: 'HTML',
        hint: 'Formatação preservada',
        accent: 'violet',
        run: () => triggerDownload(
          new Blob([
            `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(t)}</title></head><body>${html}</body></html>`,
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

  if (file.kind === 'notes') {
    const text = file.content || ''
    return [
      {
        id: 'txt',
        label: 'Texto (.txt)',
        hint: 'Arquivo de texto simples',
        accent: 'amber',
        run: () => triggerDownload(
          new Blob([text], { type: 'text/plain;charset=utf-8' }),
          safeName(t, 'txt'),
        ),
      },
      {
        id: 'md',
        label: 'Markdown (.md)',
        hint: 'Suporta formatação',
        accent: 'slate',
        run: () => triggerDownload(
          new Blob([text], { type: 'text/markdown;charset=utf-8' }),
          safeName(t, 'md'),
        ),
      },
      {
        id: 'pdf',
        label: 'PDF',
        hint: 'Pronto para imprimir',
        accent: 'rose',
        run: () => htmlToPdf(`<pre style="white-space:pre-wrap;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.6;">${escapeHtml(text)}</pre>`, t, 'rich'),
      },
    ]
  }

  if (file.kind === 'sheet') {
    return [
      {
        id: 'xlsx',
        label: 'Excel (.xlsx)',
        hint: 'Abre no Excel / LibreOffice',
        accent: 'emerald',
        run: async () => {
          const { parseWorkbookJson, universToXlsxBlob } = await import('./sheetIo')
          triggerDownload(universToXlsxBlob(parseWorkbookJson(file.content || '{}')), safeName(t, 'xlsx'))
        },
      },
      {
        id: 'csv',
        label: 'CSV',
        hint: 'Valores separados por vírgula',
        accent: 'slate',
        run: async () => {
          const { parseWorkbookJson, universToCsvBlob } = await import('./sheetIo')
          triggerDownload(universToCsvBlob(parseWorkbookJson(file.content || '{}')), safeName(t, 'csv'))
        },
      },
      {
        id: 'flimas-sheet',
        label: 'Flimas Sheet (.json)',
        hint: 'Formato nativo recarregável',
        accent: 'violet',
        run: () => triggerDownload(
          new Blob([file.content || '{}'], { type: 'application/json' }),
          safeName(t, 'flimas-sheet.json'),
        ),
      },
    ]
  }

  if (file.kind === 'code') {
    const parsed = safeParse<{ code?: string; language?: CodeLanguage }>(file.content || '')
    const code = parsed?.code ?? (file.content || '')
    const lang = (parsed?.language || 'plaintext') as CodeLanguage
    const ext = codeExtension(lang)
    const label = codeLabel(lang)
    const opts: DownloadOption[] = [
      {
        id: 'code-native',
        label: `${label} (.${ext})`,
        hint: `Extensão nativa da linguagem`,
        accent: 'sky',
        run: () => triggerDownload(
          new Blob([code], { type: 'text/plain;charset=utf-8' }),
          safeName(t, ext),
        ),
      },
      {
        id: 'code-txt',
        label: 'Texto (.txt)',
        hint: 'Como texto puro',
        accent: 'slate',
        run: () => triggerDownload(
          new Blob([code], { type: 'text/plain;charset=utf-8' }),
          safeName(t, 'txt'),
        ),
      },
      {
        id: 'code-pdf',
        label: 'PDF',
        hint: 'Listagem do código',
        accent: 'rose',
        run: () => htmlToPdf(`<pre>${escapeHtml(code)}</pre>`, t, 'code'),
      },
    ]
    return opts
  }

  if (file.kind === 'image') {
    return [
      {
        id: 'png',
        label: 'PNG',
        hint: 'Qualidade máxima',
        accent: 'pink',
        run: async () => {
          const { rasterizeFlimasImage, downloadDataUrl } = await import('./imageExport')
          const url = await rasterizeFlimasImage(file.content || '', 'png', 1)
          if (url) downloadDataUrl(url, safeName(t, 'png'))
          else alert('Esta imagem ainda não tem conteúdo salvo. Abra no Flimas Studio primeiro.')
        },
      },
      {
        id: 'jpeg',
        label: 'JPEG',
        hint: 'Menor tamanho de arquivo',
        accent: 'amber',
        run: async () => {
          const { rasterizeFlimasImage, downloadDataUrl } = await import('./imageExport')
          const url = await rasterizeFlimasImage(file.content || '', 'jpeg', 0.92)
          if (url) downloadDataUrl(url, safeName(t, 'jpg'))
          else alert('Esta imagem ainda não tem conteúdo salvo. Abra no Flimas Studio primeiro.')
        },
      },
      {
        id: 'pdf',
        label: 'PDF',
        hint: 'Imagem em uma página',
        accent: 'rose',
        run: async () => {
          const { rasterizeFlimasImageToPdfBlob } = await import('./imageExport')
          await rasterizeFlimasImageToPdfBlob(file.content || '', safeName(t, 'pdf'))
        },
      },
      {
        id: 'flimas-image',
        label: 'Flimas Image (.json)',
        hint: 'Formato nativo editável',
        accent: 'violet',
        run: () => triggerDownload(
          new Blob([file.content || '{}'], { type: 'application/json' }),
          safeName(t, 'flimas-image.json'),
        ),
      },
    ]
  }

  return []
}
