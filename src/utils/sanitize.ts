import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'data-type', 'data-checked', 'data-task-index', 'class', 'colspan', 'rowspan', 'style'],
    ADD_TAGS: ['figure', 'figcaption'],
  })
}

export function isSafeUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  try {
    const url = new URL(trimmed, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:'
  } catch {
    return false
  }
}
