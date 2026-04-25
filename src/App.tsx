import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { markdownToHtml } from './utils/markdown'
import { sanitizeHtml } from './utils/sanitize'
import { loadFiles, saveFiles, newFile } from './storage'
import type { FileEntry, FileKind } from './types'
import { isProKind } from './types'
import { loadPro, savePro, canCreate as canCreateForPlan } from './pro'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { FontSize } from './extensions/FontSize'
import flimasLogo from './assets/flimas-logo.svg'
import logoDoc from './assets/logo-doc.svg'
import logoSheet from './assets/logo-sheet.svg'
import logoCode from './assets/logo-flimasCode.png'
import logoStudio from './assets/logo-flimasStudio.png'
import logoNotes from './assets/logo-flimasNotes.svg'
import logoTasks from './assets/logo-flimasTasks.svg'
import MenuBar from './components/MenuBar'
import FindReplace from './components/FindReplace'
import Dashboard from './components/Dashboard'
import ErrorBoundary from './components/ErrorBoundary'
import TemplatePicker from './components/TemplatePicker'
import VersionHistory from './components/VersionHistory'
import HomeLanding from './components/HomeLanding'
import SettingsModal, { type ThemePreference, type DensityPreference } from './components/SettingsModal'
import UpgradeModal from './components/UpgradeModal'
import { ToastHost, toast } from './components/Toast'
import { pushSnapshot, type Snapshot } from './history'

const SETTINGS_KEY = 'flimas_settings_v1'

interface PersistedSettings {
  themePref: ThemePreference
  density: DensityPreference
  reducedMotion: boolean
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) throw new Error('no settings')
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      themePref: parsed.themePref ?? 'system',
      density: parsed.density ?? 'comfortable',
      reducedMotion: !!parsed.reducedMotion,
    }
  } catch {
    return { themePref: 'system', density: 'comfortable', reducedMotion: false }
  }
}

function saveSettings(s: PersistedSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

const SheetEditor = lazy(() => import('./components/SheetEditor'))
const CodeEditor  = lazy(() => import('./components/CodeEditor'))
const FlimasEditor = lazy(() => import('./components/flimas/FlimasEditor'))
const NotesEditor = lazy(() => import('./components/NotesEditor'))
const TasksEditor = lazy(() => import('./components/TasksEditor'))

function htmlToMarkdown(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map(processNode).join('')

    switch (tag) {
      case 'h1': return `# ${children}\n\n`
      case 'h2': return `## ${children}\n\n`
      case 'h3': return `### ${children}\n\n`
      case 'h4': return `#### ${children}\n\n`
      case 'h5': return `##### ${children}\n\n`
      case 'h6': return `###### ${children}\n\n`
      case 'p': return `${children}\n\n`
      case 'strong': case 'b': return `**${children}**`
      case 'em': case 'i': return `*${children}*`
      case 'u': return `__${children}__`
      case 's': case 'del': return `~~${children}~~`
      case 'code': return el.parentElement?.tagName.toLowerCase() === 'pre' ? children : `\`${children}\``
      case 'pre': return `\`\`\`\n${children}\n\`\`\`\n\n`
      case 'blockquote': return children.split('\n').map((l: string) => `> ${l}`).join('\n') + '\n\n'
      case 'a': return `[${children}](${el.getAttribute('href') || ''})`
      case 'img': return `![${el.getAttribute('alt') || ''}](${el.getAttribute('src') || ''})\n\n`
      case 'ul': return Array.from(el.children).map(li => `- ${processNode(li).trim()}`).join('\n') + '\n\n'
      case 'ol': return Array.from(el.children).map((li, i) => `${i + 1}. ${processNode(li).trim()}`).join('\n') + '\n\n'
      case 'li': return children
      case 'hr': return `---\n\n`
      case 'br': return `\n`
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'))
        if (!rows.length) return ''
        const md: string[] = []
        rows.forEach((row, i) => {
          const cells = Array.from(row.querySelectorAll('th,td'))
          const line = '| ' + cells.map(c => (c.textContent || '').trim()).join(' | ') + ' |'
          md.push(line)
          if (i === 0) md.push('| ' + cells.map(() => '---').join(' | ') + ' |')
        })
        return md.join('\n') + '\n\n'
      }
      default: return children
    }
  }

  return processNode(div).replace(/\n{3,}/g, '\n\n').trim()
}

function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').replace(/\n{3,}/g, '\n\n').trim()
}

function downloadFile(content: string, filename: string, type: string) {
  downloadBlob(new Blob([content], { type }), filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [view, setView] = useState<'home' | 'dashboard' | 'editor'>('home')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [saved, setSaved] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [documentTitle, setDocumentTitle] = useState('Documento sem título')
  const [editingTitle, setEditingTitle] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [templatePicker, setTemplatePicker] = useState<FileKind | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [readOnly, setReadOnly] = useState(false)

  // Settings (persisted)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const initialSettings = useMemo(() => loadSettings(), [])
  const [themePref, setThemePref] = useState<ThemePreference>(initialSettings.themePref)
  const [density, setDensity] = useState<DensityPreference>(initialSettings.density)
  const [reducedMotion, setReducedMotion] = useState<boolean>(initialSettings.reducedMotion)

  // Pro plan state (persistido em localStorage)
  const initialPro = useMemo(() => loadPro(), [])
  const [isPro, setIsPro] = useState<boolean>(initialPro.active)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined)

  const setProActive = useCallback((next: boolean) => {
    setIsPro(next)
    if (next) {
      savePro({ active: true, since: new Date().toISOString() })
      toast.success('Flimas Pro ativado (modo dev). Aproveite!')
    } else {
      savePro({ active: false })
      toast.info('Flimas Pro desativado.')
    }
  }, [])

  const openUpgrade = useCallback((reason?: string) => {
    setUpgradeReason(reason)
    setUpgradeOpen(true)
  }, [])

  const currentFile = useMemo(
    () => files.find(f => f.id === currentFileId) || null,
    [files, currentFileId]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Comece a escrever aqui...' }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      FontSize,
    ],
    content: '',
    onUpdate: () => {
      setSaved(false)
    },
    editorProps: {
      handleDrop: (view, event) => {
        const files = (event as DragEvent).dataTransfer?.files
        if (!files || files.length === 0) return false
        const images = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (images.length === 0) return false
        event.preventDefault()
        images.forEach(file => {
          const reader = new FileReader()
          reader.onload = () => {
            const src = typeof reader.result === 'string' ? reader.result : ''
            if (!src) return
            const { schema } = view.state
            const coords = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })
            const pos = coords?.pos ?? view.state.selection.from
            const node = schema.nodes.image.create({ src, alt: file.name })
            const tr = view.state.tr.insert(pos, node)
            view.dispatch(tr)
          }
          reader.readAsDataURL(file)
        })
        return true
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files
        if (!files || files.length === 0) return false
        const images = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (images.length === 0) return false
        event.preventDefault()
        images.forEach(file => {
          const reader = new FileReader()
          reader.onload = () => {
            const src = typeof reader.result === 'string' ? reader.result : ''
            if (!src) return
            const { schema } = view.state
            const node = schema.nodes.image.create({ src, alt: file.name })
            const tr = view.state.tr.replaceSelectionWith(node)
            view.dispatch(tr)
          }
          reader.readAsDataURL(file)
        })
        return true
      },
    },
  })

  // Load files + migrate legacy storage
  useEffect(() => {
    setFiles(loadFiles())
  }, [])

  // Stable refs so saveCurrent doesn't churn
  const currentFileIdRef = useRef(currentFileId)
  const documentTitleRef = useRef(documentTitle)
  // Buffer for the latest content coming out of non-doc editors (sheet / code)
  const sheetContentRef = useRef<string | null>(null)
  useEffect(() => { currentFileIdRef.current = currentFileId }, [currentFileId])
  useEffect(() => { documentTitleRef.current = documentTitle }, [documentTitle])

  const saveCurrent = useCallback(() => {
    const id = currentFileIdRef.current
    if (!id) return
    setFiles(prev => {
      const target = prev.find(f => f.id === id)
      if (!target) return prev
      let content = target.content
      if (target.kind === 'doc') {
        if (!editor) return prev
        content = editor.getHTML()
      } else if (
        target.kind === 'sheet' || target.kind === 'code'
        || target.kind === 'image' || target.kind === 'notes'
        || target.kind === 'tasks'
      ) {
        if (sheetContentRef.current !== null) content = sheetContentRef.current
      }
      const title = documentTitleRef.current
      const newFiles = prev.map(f =>
        f.id === id ? { ...f, content, title, lastModified: Date.now() } : f
      )
      saveFiles(newFiles)
      return newFiles
    })
    setSaved(true)
    setLastSaved(new Date())
  }, [editor])

  // Auto-save interval
  useEffect(() => {
    if (!currentFileId || view !== 'editor') return
    const interval = setInterval(saveCurrent, 3000)
    return () => clearInterval(interval)
  }, [currentFileId, view, saveCurrent])

  // Save on TipTap blur (only relevant for doc kind)
  useEffect(() => {
    if (!editor) return
    const onBlur = () => saveCurrent()
    editor.on('blur', onBlur)
    return () => { editor.off('blur', onBlur) }
  }, [editor, saveCurrent])

  // Save before unload
  useEffect(() => {
    const onBeforeUnload = () => saveCurrent()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveCurrent])

  // Sync title with document metadata and browser tab
  useEffect(() => {
    if (view === 'editor') {
      document.title = `${documentTitle} — Flimas`
    } else if (view === 'dashboard') {
      document.title = 'Flimas — Meus Arquivos'
    } else {
      document.title = 'Flimas Workspace'
    }
  }, [documentTitle, view])

  // Resolve effective dark mode from theme preference + OS
  useEffect(() => {
    const compute = () =>
      themePref === 'dark' ? true
      : themePref === 'light' ? false
      : systemPrefersDark()

    setDarkMode(compute())

    if (themePref !== 'system' || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setDarkMode(compute())
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [themePref])

  // Apply dark class + data-theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Apply density + reduced-motion as body classes, persist settings
  useEffect(() => {
    document.body.classList.toggle('density-compact', density === 'compact')
    document.body.classList.toggle('density-comfortable', density === 'comfortable')
  }, [density])

  useEffect(() => {
    document.body.classList.toggle('reduced-motion', reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    saveSettings({ themePref, density, reducedMotion })
  }, [themePref, density, reducedMotion])

  const handleToggleTheme = useCallback(() => {
    setThemePref(prev => (prev === 'dark' ? 'light' : prev === 'light' ? 'dark' : (systemPrefersDark() ? 'light' : 'dark')))
  }, [])

  const handleClearAllData = useCallback(() => {
    try {
      // Remove known flimas keys — avoid nuking unrelated localStorage entries.
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (
          k === 'editor_files' ||
          k === 'editor_docs' ||
          k === SETTINGS_KEY ||
          k.startsWith('editor_history_') ||
          k.startsWith('flimas_')
        ) keysToRemove.push(k)
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }
    setFiles([])
    setCurrentFileId(null)
    setView('home')
    setSettingsOpen(false)
  }, [])

  const handleOpen = useCallback((id: string) => {
    const file = files.find(f => f.id === id)
    if (!file) return
    // Persist the file currently open before switching
    if (currentFileIdRef.current && currentFileIdRef.current !== id) {
      saveCurrent()
    }
    sheetContentRef.current = null
    setCurrentFileId(id)
    setDocumentTitle(file.title)
    // Pro: arquivos Pro abrem em readonly se o usuário não tem o plano
    const lockedByPlan = isProKind(file.kind) && !isPro
    setReadOnly(lockedByPlan)
    if (lockedByPlan) {
      toast.warning(`Este arquivo é do plano Pro — abrindo em modo somente leitura.`)
    }
    if (file.kind === 'doc' && editor) {
      editor.commands.setContent(file.content || '')
    }
    setView('editor')
    setSaved(true)
    setLastSaved(null)
  }, [files, editor, saveCurrent, isPro])

  const handleCreateFromTemplate = useCallback((kind: FileKind, title: string, content: string) => {
    const created = newFile(kind, title, content)
    setFiles(prev => {
      const next = [created, ...prev]
      saveFiles(next)
      return next
    })
    queueMicrotask(() => {
      sheetContentRef.current = null
      setCurrentFileId(created.id)
      setDocumentTitle(created.title)
      if (kind === 'doc' && editor) {
        editor.commands.setContent(created.content || '')
      }
      setView('editor')
      setSaved(true)
      setLastSaved(null)
    })
  }, [editor])

  const handleCreate = useCallback((kind: FileKind = 'doc') => {
    // Paywall: Code e Studio (image) só com Pro
    if (isProKind(kind) && !canCreateForPlan(kind, isPro)) {
      const productLabel = kind === 'code' ? 'Flimas Code' : 'Flimas Studio'
      openUpgrade(`O ${productLabel} faz parte do plano Flimas Pro.`)
      return
    }
    if (kind === 'code' || kind === 'image' || kind === 'notes' || kind === 'tasks') {
      const defaultTitle =
        kind === 'code'  ? 'Código sem título'  :
        kind === 'image' ? 'Imagem sem título'  :
        kind === 'tasks' ? 'Quadro sem título'  :
                           'Nota sem título'
      const created = newFile(kind, defaultTitle, '')
      setFiles(prev => {
        const next = [created, ...prev]
        saveFiles(next)
        return next
      })
      queueMicrotask(() => {
        sheetContentRef.current = null
        setCurrentFileId(created.id)
        setDocumentTitle(created.title)
        setView('editor')
        setSaved(true)
        setLastSaved(null)
      })
      return
    }
    setTemplatePicker(kind)
  }, [isPro, openUpgrade])

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.')) return
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id)
      saveFiles(next)
      return next
    })
  }, [])

  const handleImport = useCallback(async (file: File) => {
    try {
      const lower = file.name.toLowerCase()
      const baseTitle = file.name.split('.').slice(0, -1).join('.') || file.name

      let created: FileEntry

      // Mapa extensão → linguagem Flimas Code
      const codeExtToLang: Record<string, string> = {
        '.js':  'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
        '.jsx': 'javascript',
        '.ts':  'typescript', '.tsx': 'typescript',
        '.py':  'python',
        '.css': 'css',
        '.json':'json',
        '.sql': 'sql',
      }
      const codeExt = Object.keys(codeExtToLang).find(ext => lower.endsWith(ext))

      const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']
      const isImageFile = imageExts.some(ext => lower.endsWith(ext))

      if (isImageFile) {
        // Importar imagem → abre no Flimas Studio com a imagem já colocada no canvas
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        // Marcamos o import pendente via payload especial que o FlimasEditor reconhece
        const payload = JSON.stringify({ __flimasImport: dataUrl })
        created = newFile('image', baseTitle || 'Imagem Importada', payload)
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const { xlsxBufferToUniver } = await import('./utils/sheetIo')
        const wb = xlsxBufferToUniver(buf, baseTitle)
        created = newFile('sheet', baseTitle || 'Planilha Importada', JSON.stringify(wb))
      } else if (lower.endsWith('.csv')) {
        const text = await file.text()
        const { csvTextToUniver } = await import('./utils/sheetIo')
        const wb = csvTextToUniver(text, baseTitle)
        created = newFile('sheet', baseTitle || 'Planilha Importada', JSON.stringify(wb))
      } else if (codeExt) {
        const text = await file.text()
        const payload = JSON.stringify({ language: codeExtToLang[codeExt], code: text })
        created = newFile('code', baseTitle || 'Código Importado', payload)
      } else {
        const text = await file.text()
        let content: string
        if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
          content = sanitizeHtml(markdownToHtml(text))
        } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
          content = sanitizeHtml(text)
        } else {
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          content = `<p>${escaped.replace(/\n/g, '</p><p>')}</p>`
        }
        created = newFile('doc', baseTitle || 'Documento Importado', content)
      }

      setFiles(prev => {
        const next = [created, ...prev]
        saveFiles(next)
        return next
      })
      queueMicrotask(() => handleOpen(created.id))
    } catch (err) {
      console.error('Falha ao importar arquivo', err)
      toast.error(`Não foi possível importar "${file.name}". O arquivo pode estar corrompido ou em um formato não suportado.`)
    }
  }, [handleOpen])

  const handleBackToDashboard = useCallback(() => {
    saveCurrent()
    setView('dashboard')
    setCurrentFileId(null)
  }, [saveCurrent])

  const handleRestoreVersion = useCallback((snap: Snapshot) => {
    const id = currentFileIdRef.current
    if (!id) return
    setFiles(prev => {
      const next = prev.map(f =>
        f.id === id ? { ...f, title: snap.title, content: snap.content, lastModified: Date.now() } : f
      )
      saveFiles(next)
      return next
    })
    setDocumentTitle(snap.title)
    if (snap.kind === 'doc' && editor) {
      editor.commands.setContent(snap.content || '')
    } else if (
      snap.kind === 'sheet' || snap.kind === 'code'
      || snap.kind === 'image' || snap.kind === 'notes'
      || snap.kind === 'tasks'
    ) {
      sheetContentRef.current = snap.content
      // Force remount by briefly clearing + resetting currentFileId
      setCurrentFileId(null)
      queueMicrotask(() => setCurrentFileId(id))
    }
    setShowHistory(false)
    setSaved(true)
    setLastSaved(new Date())
  }, [editor])

  // Stable refs for shortcuts
  const handleCreateRef = useRef(handleCreate)
  const saveCurrentRef = useRef(saveCurrent)
  useEffect(() => { handleCreateRef.current = handleCreate }, [handleCreate])
  useEffect(() => { saveCurrentRef.current = saveCurrent }, [saveCurrent])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(v => !v); return }
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'h') { e.preventDefault(); setShowFind(v => !v) }
      else if (key === 'p') { e.preventDefault(); window.print() }
      else if (key === 'n') { e.preventDefault(); handleCreateRef.current('doc') }
      else if (key === 's') { e.preventDefault(); saveCurrentRef.current() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (focusMode) document.body.classList.add('focus-mode')
    else document.body.classList.remove('focus-mode')
  }, [focusMode])

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  useEffect(() => {
    if (!currentFileId || view !== 'editor' || readOnly) return
    const interval = setInterval(() => {
      const file = files.find(f => f.id === currentFileId)
      if (!file) return
      const content = file.kind === 'doc' && editor
        ? editor.getHTML()
        : (sheetContentRef.current ?? file.content)
      pushSnapshot(currentFileId, {
        timestamp: Date.now(),
        title: documentTitle,
        content,
        kind: file.kind,
      })
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentFileId, view, readOnly, files, editor, documentTitle])

  const handleExportHTML = useCallback(() => {
    if (!editor) return
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  <style>
    body { font-family: 'Merriweather', serif; max-width: 800px; margin: 40px auto; padding: 0 40px; line-height: 1.8; color: #1e293b; background: #f8fafc; }
    h1,h2,h3,h4 { color: #0f172a; margin-top: 2em; }
    blockquote { border-left: 4px solid #6366f1; padding: 1rem 1.5rem; background: #eff6ff; color: #475569; font-style: italic; border-radius: 0 8px 8px 0; }
    pre { background: #0f172a; color: #e2e8f0; padding: 1.5rem; border-radius: 12px; overflow-x: auto; font-family: monospace; }
    code { background: #f1f5f9; color: #6366f1; padding: 0.2em 0.4em; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 2em 0; }
    th, td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
    th { background: #f8fafc; font-weight: bold; }
    img { max-width: 100%; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
${editor.getHTML()}
</body>
</html>`
    downloadFile(html, `${documentTitle}.html`, 'text/html')
  }, [editor, documentTitle])

  const handleExportTXT = useCallback(() => {
    if (!editor) return
    downloadFile(htmlToText(editor.getHTML()), `${documentTitle}.txt`, 'text/plain')
  }, [editor, documentTitle])

  const handleExportMD = useCallback(() => {
    if (!editor) return
    downloadFile(htmlToMarkdown(editor.getHTML()), `${documentTitle}.md`, 'text/markdown')
  }, [editor, documentTitle])

  const handleExportPDF = useCallback(async () => {
    if (!editor) return
    const html2pdf = (await import('html2pdf.js')).default
    const container = document.createElement('div')
    container.innerHTML = `
      <div style="font-family: 'Merriweather', Georgia, serif; max-width: 720px; margin: 0 auto; padding: 32px 40px; line-height: 1.7; color: #1e293b;">
        <style>
          h1,h2,h3,h4 { color: #0f172a; margin-top: 1.4em; page-break-after: avoid; }
          blockquote { border-left: 4px solid #6366f1; padding: 0.75rem 1.25rem; background: #eff6ff; color: #475569; font-style: italic; border-radius: 0 8px 8px 0; }
          pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 10px; overflow-x: auto; font-family: monospace; font-size: 0.85em; }
          code { background: #f1f5f9; color: #6366f1; padding: 0.15em 0.35em; border-radius: 4px; }
          table { border-collapse: collapse; width: 100%; margin: 1.25em 0; }
          th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
          th { background: #f8fafc; font-weight: bold; }
          img { max-width: 100%; border-radius: 8px; page-break-inside: avoid; }
          p, li { page-break-inside: avoid; }
        </style>
        ${editor.getHTML()}
      </div>`
    await (html2pdf() as unknown as { set: (o: Record<string, unknown>) => { from: (el: HTMLElement) => { save: () => Promise<void> } } })
      .set({
        margin: [10, 10, 10, 10],
        filename: `${documentTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(container)
      .save()
  }, [editor, documentTitle])

  const getCurrentSheetRaw = useCallback(() => {
    if (!currentFile || currentFile.kind !== 'sheet') return null
    return sheetContentRef.current ?? currentFile.content
  }, [currentFile])

  const handleExportXLSX = useCallback(async () => {
    const raw = getCurrentSheetRaw()
    if (raw === null) return
    const { parseWorkbookJson, universToXlsxBlob } = await import('./utils/sheetIo')
    downloadBlob(universToXlsxBlob(parseWorkbookJson(raw)), `${documentTitle}.xlsx`)
  }, [getCurrentSheetRaw, documentTitle])

  const handleExportCSV = useCallback(async () => {
    const raw = getCurrentSheetRaw()
    if (raw === null) return
    const { parseWorkbookJson, universToCsvBlob } = await import('./utils/sheetIo')
    downloadBlob(universToCsvBlob(parseWorkbookJson(raw)), `${documentTitle}.csv`)
  }, [getCurrentSheetRaw, documentTitle])

  // Studio exports from the header — uses the latest in-memory content
  const getCurrentImageRaw = useCallback(() => {
    if (!currentFile || currentFile.kind !== 'image') return null
    return sheetContentRef.current ?? currentFile.content
  }, [currentFile])

  const [studioExportOpen, setStudioExportOpen] = useState(false)

  const handleStudioExport = useCallback(async (format: 'png' | 'jpeg' | 'pdf') => {
    setStudioExportOpen(false)
    const raw = getCurrentImageRaw()
    if (!raw) return
    const { rasterizeFlimasImage, rasterizeFlimasImageToPdfBlob, downloadDataUrl } = await import('./utils/imageExport')
    const safe = (documentTitle || 'imagem').replace(/[\/\\?%*:|"<>]+/g, '_').trim() || 'imagem'
    if (format === 'pdf') {
      await rasterizeFlimasImageToPdfBlob(raw, `${safe}.pdf`)
      return
    }
    const url = await rasterizeFlimasImage(raw, format, format === 'png' ? 1 : 0.92)
    if (url) downloadDataUrl(url, `${safe}.${format === 'jpeg' ? 'jpg' : 'png'}`)
  }, [documentTitle, getCurrentImageRaw])

  const wordCount = editor?.storage.characterCount?.words() ?? 0
  const charCount = editor?.storage.characterCount?.characters() ?? 0

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const templateNode = templatePicker && (
    <TemplatePicker
      kind={templatePicker}
      onPick={(name, content) => {
        const pickedKind = templatePicker
        setTemplatePicker(null)
        handleCreateFromTemplate(pickedKind, name, content)
      }}
      onClose={() => setTemplatePicker(null)}
    />
  )

  const settingsNode = (
    <SettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      themePref={themePref}
      onThemeChange={setThemePref}
      density={density}
      onDensityChange={setDensity}
      reducedMotion={reducedMotion}
      onReducedMotionChange={setReducedMotion}
      onClearAllData={handleClearAllData}
      filesCount={files.length}
      isPro={isPro}
      onTogglePro={setProActive}
      onOpenUpgrade={() => { setSettingsOpen(false); openUpgrade() }}
    />
  )

  const upgradeNode = (
    <UpgradeModal
      open={upgradeOpen}
      onClose={() => setUpgradeOpen(false)}
      isPro={isPro}
      onActivateDev={() => setProActive(true)}
      onCancelDev={() => setProActive(false)}
      reason={upgradeReason}
    />
  )

  const toastHostNode = <ToastHost />


  if (view === 'home') {
    return (
      <ErrorBoundary>
        <HomeLanding
          files={files}
          onCreate={handleCreate}
          onOpenFiles={() => setView('dashboard')}
          onOpenFile={handleOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          isPro={isPro}
          onOpenUpgrade={() => openUpgrade()}
        />
        {templateNode}
        {settingsNode}
        {upgradeNode}
        {toastHostNode}
      </ErrorBoundary>
    )
  }

  if (view === 'dashboard') {
    return (
      <ErrorBoundary>
        <Dashboard
          files={files}
          onCreate={handleCreate}
          onOpen={handleOpen}
          onDelete={handleDelete}
          onImport={handleImport}
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onGoHome={() => setView('home')}
          onOpenSettings={() => setSettingsOpen(true)}
          isPro={isPro}
          onOpenUpgrade={() => openUpgrade()}
        />
        {templateNode}
        {settingsNode}
        {upgradeNode}
        {toastHostNode}
      </ErrorBoundary>
    )
  }

  const isSheet = currentFile?.kind === 'sheet'
  const isCode  = currentFile?.kind === 'code'
  const isImage = currentFile?.kind === 'image'
  const isNotes = currentFile?.kind === 'notes'
  const isTasks = currentFile?.kind === 'tasks'

  const brandLogo =
    isSheet ? logoSheet :
    isCode  ? logoCode  :
    isImage ? logoStudio :
    isNotes ? logoNotes :
    isTasks ? logoTasks :
    logoDoc

  const brandLabel =
    isSheet ? 'Flimas Sheets' :
    isCode  ? 'Flimas Code'   :
    isImage ? 'Flimas Studio' :
    isNotes ? 'Flimas Notes'  :
    isTasks ? 'Flimas Tasks'  :
    'Flimas Docs'

  const brandSubtitle =
    isSheet ? 'Planilha' :
    isCode  ? 'Código'   :
    isImage ? 'Imagem'   :
    isNotes ? 'Anotação' :
    isTasks ? 'Quadro'   :
    'Documento'

  const brandAccent =
    isSheet ? 'text-emerald-600' :
    isCode  ? 'text-sky-600'     :
    isImage ? 'text-pink-500'    :
    isNotes ? 'text-amber-500'   :
    isTasks ? 'text-blue-600'    :
    'text-violet-500'

  return (
    <ErrorBoundary onReset={() => { setView('dashboard'); setCurrentFileId(null) }}>
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${focusMode ? 'focus-mode-root' : ''}`}>

      {/* ── App Header ──────────────────────────────── */}
      <header className="glass-panel sticky top-0 z-[60] flex items-center gap-4 px-6 py-3 border-b border-white select-none shadow-sm">
        <button
          onClick={handleBackToDashboard}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all group"
          title="Voltar para Meus Arquivos"
          aria-label="Voltar para Meus Arquivos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>

        <button
          onClick={() => setView('home')}
          className="hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity"
          title="Ir para a tela inicial"
          aria-label="Ir para a tela inicial"
        >
          <img src={flimasLogo} alt="Flimas" className="h-7 w-auto" />
        </button>
        <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-700/50" />
        <div className="hidden md:flex items-center gap-3 cursor-default">
          <img src={brandLogo} alt={brandLabel} className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight leading-none bg-clip-text text-transparent" style={{ backgroundImage: 'var(--logo-gradient)' }}>{brandLabel}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${brandAccent}`}>{brandSubtitle}</span>
          </div>
        </div>

        <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-700/50 mx-2" />

        <div className="flex-1 max-w-md relative group">
          {editingTitle ? (
            <input
              type="text"
              value={documentTitle}
              onChange={e => setDocumentTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingTitle(false)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-violet-500/50 rounded-xl px-4 py-1.5 font-semibold text-sm focus:outline-none focus:ring-4 ring-violet-500/10 transition-all"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="w-full text-left px-4 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold truncate transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Clique para renomear"
            >
              {documentTitle}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
           <div
             className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
             role="status"
             aria-live="polite"
           >
             {saved ? (
               <>
                 <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                 <span className="text-slate-500 dark:text-slate-400">{lastSaved ? `Salvo às ${formatTime(lastSaved)}` : 'Arquivo Salvo'}</span>
               </>
             ) : (
               <>
                 <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                 <span className="text-slate-500 dark:text-slate-400">Alterações não salvas</span>
               </>
             )}
           </div>

           {isSheet && (
             <div className="hidden md:flex items-center gap-1.5">
               <button
                 onClick={handleExportXLSX}
                 className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                 title="Exportar como .xlsx"
               >
                 .xlsx
               </button>
               <button
                 onClick={handleExportCSV}
                 className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                 title="Exportar como .csv"
               >
                 .csv
               </button>
             </div>
           )}

           {isImage && (
             <div className="hidden md:block relative">
               <button
                 onClick={() => { saveCurrent(); setStudioExportOpen(v => !v) }}
                 className="px-3 py-1.5 text-xs font-bold rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition-colors flex items-center gap-1.5"
                 title="Salvar como PNG / JPEG / PDF"
                 aria-haspopup="menu"
                 aria-expanded={studioExportOpen}
               >
                 Salvar como
                 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
               </button>
               {studioExportOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setStudioExportOpen(false)} />
                   <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-page)] rounded-xl shadow-xl border border-[var(--border-light)] overflow-hidden z-50" role="menu">
                     <button
                       onClick={() => handleStudioExport('png')}
                       className="w-full px-4 py-2.5 flex items-center justify-between text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors"
                       role="menuitem"
                     >
                       <div className="flex flex-col">
                         <span>PNG</span>
                         <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Qualidade máxima</span>
                       </div>
                       <span className="text-[10px] font-bold text-pink-500">.png</span>
                     </button>
                     <button
                       onClick={() => handleStudioExport('jpeg')}
                       className="w-full px-4 py-2.5 flex items-center justify-between text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors border-t border-[var(--border-light)]"
                       role="menuitem"
                     >
                       <div className="flex flex-col">
                         <span>JPEG</span>
                         <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Arquivo menor</span>
                       </div>
                       <span className="text-[10px] font-bold text-amber-500">.jpg</span>
                     </button>
                     <button
                       onClick={() => handleStudioExport('pdf')}
                       className="w-full px-4 py-2.5 flex items-center justify-between text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-light)] dark:hover:bg-slate-700 transition-colors border-t border-[var(--border-light)]"
                       role="menuitem"
                     >
                       <div className="flex flex-col">
                         <span>PDF</span>
                         <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Imagem em uma página</span>
                       </div>
                       <span className="text-[10px] font-bold text-rose-500">.pdf</span>
                     </button>
                   </div>
                 </>
               )}
             </div>
           )}

           <button
             onClick={() => setReadOnly(v => !v)}
             className={`flex w-9 h-9 rounded-lg items-center justify-center transition-colors ${readOnly ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-600'}`}
             title={readOnly ? 'Editar arquivo' : 'Modo somente leitura'}
             aria-label={readOnly ? 'Sair do modo somente leitura' : 'Ativar somente leitura'}
             aria-pressed={readOnly}
           >
             {readOnly ? '🔒' : '🔓'}
           </button>

           <button
             onClick={() => setShowHistory(true)}
             className="flex w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-600 items-center justify-center transition-colors"
             title="Histórico de versões"
             aria-label="Abrir histórico de versões"
           >
             🕓
           </button>

           {!isSheet && !isCode && !isImage && !isNotes && !isTasks && (
             <button
               onClick={handleExportPDF}
               className="hidden md:flex px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
               title="Exportar como PDF"
               aria-label="Exportar como PDF"
             >
               .pdf
             </button>
           )}

           {!isImage && !isSheet && !isCode && !isNotes && !isTasks && (
             <button
               onClick={() => window.print()}
               className="hidden md:flex w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-600 items-center justify-center transition-colors"
               title="Imprimir (Ctrl+P)"
               aria-label="Imprimir"
             >
               🖨️
             </button>
           )}

           <button
              onClick={saveCurrent}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
              aria-label="Salvar arquivo"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
             <span className="hidden sm:inline">Salvar</span>
           </button>

           <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/50" />

           <button
              onClick={handleToggleTheme}
              className="w-10 h-10 rounded-xl bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] flex items-center justify-center transition-all group overflow-hidden relative border border-slate-200 dark:border-slate-700"
              aria-label="Alternar tema"
              title="Alternar tema"
           >
              <div className={`transition-transform duration-500 ${darkMode ? 'translate-y-12' : 'translate-y-0'}`}>🌙</div>
              <div className={`absolute transition-transform duration-500 ${darkMode ? 'translate-y-0' : '-translate-y-12'}`}>☀️</div>
           </button>

           <button
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 rounded-xl bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Configurações"
              title="Configurações"
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
           </button>
        </div>
      </header>

      {isSheet && currentFile ? (
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <img src={logoSheet} alt="" className="w-16 h-16 mb-3 mx-auto animate-pulse" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">Carregando planilha…</p>
            </div>
          </div>
        }>
          <SheetEditor
            fileId={currentFile.id}
            initialContent={currentFile.content}
            darkMode={darkMode}
            onChange={(json) => {
              sheetContentRef.current = json
              setSaved(false)
            }}
          />
        </Suspense>
      ) : isCode && currentFile ? (
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <img src={logoCode} alt="" className="w-16 h-16 mb-3 mx-auto animate-pulse" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">Carregando editor de código…</p>
            </div>
          </div>
        }>
          <CodeEditor
            fileId={currentFile.id}
            initialContent={currentFile.content}
            darkMode={darkMode}
            readOnly={readOnly}
            onChange={(json) => {
              sheetContentRef.current = json
              setSaved(false)
            }}
          />
        </Suspense>
      ) : isImage && currentFile ? (
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-6xl mb-3 block animate-pulse">🖌️</span>
              <p className="text-slate-500 dark:text-slate-400 font-semibold">Carregando Flimas Studio…</p>
            </div>
          </div>
        }>
          <FlimasEditor
            fileId={currentFile.id}
            initialContent={currentFile.content}
            darkMode={darkMode}
            readOnly={readOnly}
            onChange={(json) => {
              sheetContentRef.current = json
              setSaved(false)
            }}
          />
        </Suspense>
      ) : isNotes && currentFile ? (
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <img src={logoNotes} alt="" className="w-16 h-16 mb-3 mx-auto animate-pulse" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">Carregando Flimas Notes…</p>
            </div>
          </div>
        }>
          <NotesEditor
            fileId={currentFile.id}
            initialContent={currentFile.content}
            darkMode={darkMode}
            readOnly={readOnly}
            onChange={(text) => {
              sheetContentRef.current = text
              setSaved(false)
            }}
          />
        </Suspense>
      ) : isTasks && currentFile ? (
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <img src={logoTasks} alt="" className="w-16 h-16 mb-3 mx-auto animate-pulse" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">Carregando Flimas Tasks…</p>
            </div>
          </div>
        }>
          <TasksEditor
            fileId={currentFile.id}
            initialContent={currentFile.content}
            darkMode={darkMode}
            readOnly={readOnly}
            onChange={(json) => {
              sheetContentRef.current = json
              setSaved(false)
            }}
          />
        </Suspense>
      ) : (
        <>
          <MenuBar
            editor={editor}
            onToggleFind={() => setShowFind(v => !v)}
            onExportHTML={handleExportHTML}
            onExportTXT={handleExportTXT}
            onExportMD={handleExportMD}
            onExportPDF={handleExportPDF}
            onPrint={() => window.print()}
            onNew={() => handleCreate('doc')}
            zoom={zoom}
            onZoomChange={setZoom}
          />

          {showFind && (
            <div className="glass-panel p-1 border-b border-white z-40">
               <FindReplace editor={editor} onClose={() => setShowFind(false)} />
            </div>
          )}

          <main className="flex-1 overflow-auto py-12 px-6 bg-[var(--bg-app)] transition-colors duration-500">
            <div
              className="editor-page hover:shadow-2xl"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                marginBottom: zoom < 100 ? `${-(1056 * (1 - zoom / 100))}px` : '4rem',
              }}
            >
              <EditorContent editor={editor} className="min-h-full" />
            </div>
          </main>

          <footer className="glass-panel border-t border-white px-6 py-2 flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full bg-violet-500" />
               <span>{wordCount} palavras</span>
            </div>
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full bg-purple-500" />
               <span>{charCount} caracteres</span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-ui)] rounded-lg">
                  <span className="text-violet-500">Ctrl + S</span>
                  <span className="opacity-50">para salvar</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-ui)] rounded-lg">
                  <span className="text-violet-500">Ctrl + H</span>
                  <span className="opacity-50">localizar</span>
               </div>
            </div>
          </footer>
        </>
      )}

      <style>{`
        @media print {
          header, .glass-panel:not(.editor-page), footer, .menubar-wrap { display: none !important; }
          .editor-page { box-shadow: none !important; margin: 0 !important; transform: none !important; width: 100% !important; }
          main { background: white !important; padding: 0 !important; }
          body { background: white !important; }
        }
        body.focus-mode header, body.focus-mode footer, body.focus-mode .menubar-wrap { opacity: 0; pointer-events: none; transition: opacity 0.2s ease; }
        body.focus-mode header:hover, body.focus-mode footer:hover { opacity: 1; pointer-events: auto; }
      `}</style>

      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed bottom-6 right-6 z-[70] px-3 py-2 text-xs font-bold bg-slate-800 text-white rounded-full shadow-xl opacity-40 hover:opacity-100 transition-opacity"
          aria-label="Sair do modo foco"
          title="Sair do modo foco (F11)"
        >
          Sair do foco (F11)
        </button>
      )}

      {templateNode}

      {showHistory && currentFile && (
        <VersionHistory
          fileId={currentFile.id}
          onRestore={handleRestoreVersion}
          onClose={() => setShowHistory(false)}
        />
      )}

      {settingsNode}
      {upgradeNode}
      {toastHostNode}
    </div>
    </ErrorBoundary>
  )
}
