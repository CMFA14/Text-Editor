import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string
}
