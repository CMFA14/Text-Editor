import { marked } from 'marked'

/**
 * Pós-processamento: marked v12 emite `<input ... disabled="">` para checkboxes
 * de GFM task lists. Reescrevemos o HTML pra remover o disabled, anexar
 * `data-task-index` sequencial e adicionar a classe `md-task-checkbox` para
 * estilização. Assim conseguimos clicar nas caixinhas do Flimas Notes e
 * mapear a posição pra alternar `[ ]` ↔ `[x]` no markdown bruto.
 */
function rewriteCheckboxes(html: string): string {
  let i = 0
  return html.replace(/<input([^>]*?)type="checkbox"([^>]*?)>/g, (_full, pre: string, post: string) => {
    const attrs = `${pre} ${post}`
    const checked = /checked(="[^"]*")?/i.test(attrs)
    const idx = i++
    return `<input type="checkbox" class="md-task-checkbox" data-task-index="${idx}"${checked ? ' checked' : ''} />`
  })
}

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function markdownToHtml(md: string): string {
  const raw = marked.parse(md, { async: false }) as string
  return rewriteCheckboxes(raw)
}

/**
 * Alterna o n-ésimo task (`- [ ]` ↔ `- [x]`) no markdown bruto.
 * Retorna nova string ou a original caso o índice esteja fora.
 * Usado pelo preview interativo do Flimas Notes.
 */
export function toggleTaskInMarkdown(md: string, index: number): string {
  // Captura "- [ ]" ou "- [x]" / "* [ ]" / "+ [ ]" no início da linha (após whitespace).
  const taskRe = /^(\s*[-*+]\s+\[)([ xX])(\])/gm
  let i = 0
  return md.replace(taskRe, (full, p1, mark, p3) => {
    if (i++ !== index) return full
    const next = (mark === ' ') ? 'x' : ' '
    return `${p1}${next}${p3}`
  })
}
