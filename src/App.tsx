import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
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
import MenuBar from './components/MenuBar'
import FindReplace from './components/FindReplace'
import Dashboard from './components/Dashboard'

export interface DocEntry {
  id: string
  title: string
  content: string
  lastModified: number
}

const DEFAULT_CONTENT = `
<h1>📝 Bem-vindo ao DocFlex</h1>
<p>Este é um editor de texto completo e profissional com suporte a uma grande variedade de formatações e recursos avançados.</p>

<h2>✨ Recursos disponíveis</h2>
<ul>
  <li><strong>Negrito</strong>, <em>itálico</em>, <u>sublinhado</u> e <s>tachado</s></li>
  <li>Títulos de H1 a H6</li>
  <li>Múltiplas fontes e tamanhos</li>
  <li>Cores de texto e realce</li>
  <li>Alinhamento de texto</li>
  <li>Listas numeradas e com marcadores</li>
</ul>

<h2>📋 Lista de tarefas</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true">Criar um editor rico em recursos</li>
  <li data-type="taskItem" data-checked="true">Adicionar suporte a tabelas</li>
  <li data-type="taskItem" data-checked="false">Exportar para HTML, TXT e Markdown</li>
  <li data-type="taskItem" data-checked="false">Localizar e substituir texto</li>
</ul>

<h2>💬 Exemplo de citação</h2>
<blockquote>
  <p>"A simplicidade é a sofisticação máxima." — Leonardo da Vinci</p>
</blockquote>

<h2>📊 Exemplo de tabela</h2>
<table>
  <tbody>
    <tr>
      <th>Recurso</th>
      <th>Descrição</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Formatação de texto</td>
      <td>Negrito, itálico, sublinhado e mais</td>
      <td>✅ Disponível</td>
    </tr>
    <tr>
      <td>Tabelas</td>
      <td>Criação e edição de tabelas</td>
      <td>✅ Disponível</td>
    </tr>
    <tr>
      <td>Imagens</td>
      <td>Inserção por URL ou arquivo local</td>
      <td>✅ Disponível</td>
    </tr>
    <tr>
      <td>Exportação</td>
      <td>HTML, TXT e Markdown</td>
      <td>✅ Disponível</td>
    </tr>
  </tbody>
</table>

<h2>🖥️ Código</h2>
<p>Você pode inserir código inline como <code>console.log("Hello World")</code> ou blocos de código:</p>
<pre><code>function saudacao(nome: string): string {
  return \`Olá, \${nome}! Bem-vindo ao Editor Pro.\`
}

const msg = saudacao("Desenvolvedor")
console.log(msg)</code></pre>

<p>Comece a editar este documento ou apague tudo e crie o seu próprio! 🚀</p>
`

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
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard')
  const [documents, setDocuments] = useState<DocEntry[]>([])
  const [currentDocId, setCurrentDocId] = useState<string | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [saved, setSaved] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [documentTitle, setDocumentTitle] = useState('Documento sem título')
  const [editingTitle, setEditingTitle] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

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
  })

  // Load documents and perform migration
  useEffect(() => {
    const savedDocs = localStorage.getItem('editor_docs')
    let docs: DocEntry[] = savedDocs ? JSON.parse(savedDocs) : []

    // Migration from old single-doc format
    const oldContent = localStorage.getItem('editor_content')
    const oldTitle = localStorage.getItem('editor_title')

    if (oldContent && docs.length === 0) {
      const migratedDoc: DocEntry = {
        id: crypto.randomUUID(),
        title: oldTitle || 'Documento Recuperado',
        content: oldContent,
        lastModified: Date.now()
      }
      docs = [migratedDoc]
      localStorage.setItem('editor_docs', JSON.stringify(docs))
      // Optional: clear old keys to complete migration
      // localStorage.removeItem('editor_content')
      // localStorage.removeItem('editor_title')
    }

    setDocuments(docs)
  }, [])

  // Auto-save logic
  useEffect(() => {
    if (!editor || !currentDocId || view !== 'editor') return

    const interval = setInterval(() => {
      const html = editor.getHTML()
      setDocuments(prev => {
        const newDocs = prev.map(d =>
          d.id === currentDocId
            ? { ...d, content: html, title: documentTitle, lastModified: Date.now() }
            : d
        )
        localStorage.setItem('editor_docs', JSON.stringify(newDocs))
        return newDocs
      })
      setSaved(true)
      setLastSaved(new Date())
    }, 3000)

    return () => clearInterval(interval)
  }, [editor, currentDocId, view, documentTitle])

  // Sync title with document metadata and browser tab
  useEffect(() => {
    if (view === 'editor') {
       document.title = `${documentTitle} — DocFlex`
    } else {
       document.title = 'DocFlex — Meus Documentos'
    }
  }, [documentTitle, view])

  // Theme application
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleCreate = useCallback(() => {
    const newDoc: DocEntry = {
      id: crypto.randomUUID(),
      title: 'Documento sem título',
      content: '',
      lastModified: Date.now()
    }
    const newDocs = [newDoc, ...documents]
    setDocuments(newDocs)
    localStorage.setItem('editor_docs', JSON.stringify(newDocs))
    handleOpen(newDoc.id)
  }, [documents])

  const handleOpen = useCallback((id: string) => {
    const doc = documents.find(d => d.id === id)
    if (doc && editor) {
      setCurrentDocId(id)
      setDocumentTitle(doc.title)
      editor.commands.setContent(doc.content)
      setView('editor')
      setSaved(true)
      setLastSaved(null)
    }
  }, [documents, editor])

  const handleDelete = useCallback((id: string) => {
    if (confirm('Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.')) {
      const newDocs = documents.filter(d => d.id !== id)
      setDocuments(newDocs)
      localStorage.setItem('editor_docs', JSON.stringify(newDocs))
    }
  }, [documents])

  const handleImport = useCallback(async (file: File) => {
    const text = await file.text()
    let content = text

    // Simple check to see if it's HTML or plain text
    if (!file.name.endsWith('.html') && !file.name.endsWith('.md')) {
      content = `<p>${text.replace(/\n/g, '</p><p>')}</p>`
    }

    const newDoc: DocEntry = {
      id: crypto.randomUUID(),
      title: file.name.split('.').slice(0, -1).join('.') || 'Documento Importado',
      content: content,
      lastModified: Date.now()
    }
    const newDocs = [newDoc, ...documents]
    setDocuments(newDocs)
    localStorage.setItem('editor_docs', JSON.stringify(newDocs))
    handleOpen(newDoc.id)
  }, [documents, handleOpen])

  const handleBackToDashboard = useCallback(() => {
    if (!saved && editor) {
        // Force save before leaving
        const html = editor.getHTML()
        const newDocs = documents.map(d =>
          d.id === currentDocId ? { ...d, content: html, title: documentTitle, lastModified: Date.now() } : d
        )
        setDocuments(newDocs)
        localStorage.setItem('editor_docs', JSON.stringify(newDocs))
    }
    setView('dashboard')
    setCurrentDocId(null)
  }, [saved, editor, currentDocId, documents, documentTitle])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setShowFind(v => !v) }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); window.print() }
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleCreate() }
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault()
          if (editor && currentDocId) {
            const html = editor.getHTML()
            const newDocs = documents.map(d =>
              d.id === currentDocId ? { ...d, content: html, title: documentTitle, lastModified: Date.now() } : d
            )
            setDocuments(newDocs)
            localStorage.setItem('editor_docs', JSON.stringify(newDocs))
            setSaved(true)
            setLastSaved(new Date())
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor, handleCreate, documents, currentDocId, documentTitle])

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

  const wordCount = editor?.storage.characterCount?.words() ?? 0
  const charCount = editor?.storage.characterCount?.characters() ?? 0

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (view === 'dashboard') {
    return (
      <Dashboard
        documents={documents}
        onCreate={handleCreate}
        onOpen={handleOpen}
        onDelete={handleDelete}
        onImport={handleImport}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />
    )
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500`}>

      {/* ── App Header ──────────────────────────────── */}
      <header className="glass-panel sticky top-0 z-[60] flex items-center gap-4 px-6 py-3 border-b border-white select-none shadow-sm">
        {/* Back Button */}
        <button
          onClick={handleBackToDashboard}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all group"
          title="Voltar para Meus Documentos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>

        {/* Logo (Desktop only) */}
        <div className="hidden md:flex items-center gap-3 cursor-default">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <span className="text-xl text-white">📝</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight leading-none bg-clip-text text-transparent" style={{ backgroundImage: 'var(--logo-gradient)' }}>DocFlex</span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Workspace</span>
          </div>
        </div>

        <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-700/50 mx-2" />

        {/* Document title */}
        <div className="flex-1 max-w-md relative group">
          {editingTitle ? (
            <input
              type="text"
              value={documentTitle}
              onChange={e => setDocumentTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingTitle(false)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500/50 rounded-xl px-4 py-1.5 font-semibold text-sm focus:outline-none focus:ring-4 ring-indigo-500/10 transition-all"
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

        {/* Action area */}
        <div className="flex items-center gap-4">
           {/* Save status */}
           <div className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
             {saved ? (
               <>
                 <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                 <span className="text-slate-500 dark:text-slate-400">{lastSaved ? `Salvo às ${formatTime(lastSaved)}` : 'Documento Salvo'}</span>
               </>
             ) : (
               <>
                 <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                 <span className="text-slate-500 dark:text-slate-400">Alterações não salvas</span>
               </>
             )}
           </div>

           {/* Save button mockup (the editor auto-saves, but a button feels "Pro") */}
           <button
              onClick={() => {
                if (editor && currentDocId) {
                  const html = editor.getHTML()
                  const newDocs = documents.map(d => d.id === currentDocId ? { ...d, content: html, title: documentTitle, lastModified: Date.now() } : d)
                  setDocuments(newDocs)
                  localStorage.setItem('editor_docs', JSON.stringify(newDocs))
                  setSaved(true)
                  setLastSaved(new Date())
                }
              }}
              className="hidden sm:flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
             Salvar
           </button>

           <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/50" />

           {/* Theme toggle */}
           <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 rounded-xl bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] flex items-center justify-center transition-all group overflow-hidden relative border border-slate-200 dark:border-slate-700"
           >
              <div className={`transition-transform duration-500 ${darkMode ? 'translate-y-12' : 'translate-y-0'}`}>🌙</div>
              <div className={`absolute transition-transform duration-500 ${darkMode ? 'translate-y-0' : '-translate-y-12'}`}>☀️</div>
           </button>
        </div>
      </header>

      {/* ── Toolbar Area ────────────────────────────── */}
      <MenuBar
        editor={editor}
        wordCount={wordCount}
        charCount={charCount}
        onToggleFind={() => setShowFind(v => !v)}
        onExportHTML={handleExportHTML}
        onExportTXT={handleExportTXT}
        onExportMD={handleExportMD}
        onPrint={() => window.print()}
        onNew={handleCreate}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {showFind && (
        <div className="glass-panel p-1 border-b border-white z-40">
           <FindReplace editor={editor} onClose={() => setShowFind(false)} />
        </div>
      )}

      {/* ── Editor Canvas ──────────────────────────── */}
      <main
        className="flex-1 overflow-auto py-12 px-6 bg-[var(--bg-app)] transition-colors duration-500"
      >
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

      {/* ── Status Bar ──────────────────────────────── */}
      <footer className="glass-panel border-t border-white px-6 py-2 flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
        <div className="flex items-center gap-1.5">
           <span className="w-2 h-2 rounded-full bg-indigo-500" />
           <span>{wordCount} palavras</span>
        </div>
        <div className="flex items-center gap-1.5">
           <span className="w-2 h-2 rounded-full bg-purple-500" />
           <span>{charCount} caracteres</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-ui)] rounded-lg">
              <span className="text-indigo-500">Ctrl + S</span>
              <span className="opacity-50">para salvar</span>
           </div>
           <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-ui)] rounded-lg">
              <span className="text-indigo-500">Ctrl + H</span>
              <span className="opacity-50">localizar</span>
           </div>
        </div>
      </footer>

      {/* ── Print styles ─────────────────────────────── */}
      <style>{`
        @media print {
          header, .glass-panel:not(.editor-page), footer, .menubar-wrap { display: none !important; }
          .editor-page { box-shadow: none !important; margin: 0 !important; transform: none !important; width: 100% !important; }
          main { background: white !important; padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
