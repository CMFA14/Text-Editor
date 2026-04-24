import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json as jsonLang } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'
import type { CodeFileContent, CodeLanguage } from '../types'

interface CodeEditorProps {
  fileId: string
  initialContent: string
  darkMode: boolean
  onChange: (json: string) => void
  readOnly?: boolean
}

const LANGUAGES: { value: CodeLanguage; label: string; runnable: boolean }[] = [
  { value: 'javascript', label: 'JavaScript', runnable: true  },
  { value: 'typescript', label: 'TypeScript', runnable: false },
  { value: 'html',       label: 'HTML',       runnable: true  },
  { value: 'css',        label: 'CSS',        runnable: false },
  { value: 'python',     label: 'Python',     runnable: false },
  { value: 'sql',        label: 'SQL',        runnable: false },
  { value: 'json',       label: 'JSON',       runnable: false },
  { value: 'markdown',   label: 'Markdown',   runnable: false },
  { value: 'plaintext',  label: 'Texto puro', runnable: false },
]

const STARTER: Record<CodeLanguage, string> = {
  javascript: `// Flimas Code — JavaScript\n// Clique em "Executar" para rodar\n\nconst hello = (name) => \`Olá, \${name}!\`\nconsole.log(hello('mundo'))\n\nconst numeros = [1, 2, 3, 4, 5]\nconst soma = numeros.reduce((a, b) => a + b, 0)\nconsole.log('Soma:', soma)\n`,
  typescript: `// TypeScript\n// (execução ainda não disponível — em breve)\n\ninterface Pessoa {\n  nome: string\n  idade: number\n}\n\nconst p: Pessoa = { nome: 'Ada', idade: 36 }\nconsole.log(p)\n`,
  html: `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8" />\n  <title>Flimas Code</title>\n  <style>\n    body { font-family: sans-serif; display: grid; place-items: center; height: 100vh; background: #f3e8ff; }\n    h1   { color: #7c3aed; }\n  </style>\n</head>\n<body>\n  <h1>Olá, Flimas!</h1>\n</body>\n</html>\n`,
  css: `/* CSS */\nbody {\n  font-family: sans-serif;\n  background: #0f172a;\n  color: #f1f5f9;\n}\n\n.card {\n  padding: 1rem;\n  border-radius: 12px;\n  background: #1e293b;\n}\n`,
  python: `# Python\n# (execução ainda não disponível — em breve)\n\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])\n`,
  sql: `-- SQL\nSELECT\n  u.nome,\n  COUNT(p.id) AS total_pedidos\nFROM usuarios u\nLEFT JOIN pedidos p ON p.usuario_id = u.id\nGROUP BY u.nome\nORDER BY total_pedidos DESC;\n`,
  json: `{\n  "nome": "Flimas",\n  "versao": "1.0.0",\n  "features": ["docs", "sheets", "code"]\n}\n`,
  markdown: `# Flimas Code\n\n**Markdown** editado com syntax highlighting.\n\n- item 1\n- item 2\n\n\`\`\`js\nconsole.log('hello')\n\`\`\`\n`,
  plaintext: '',
}

function parseContent(raw: string): CodeFileContent {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<CodeFileContent>
      if (parsed && typeof parsed.code === 'string' && parsed.language) {
        return { language: parsed.language as CodeLanguage, code: parsed.code }
      }
    } catch {
      // se não é JSON, trata como código puro em JS
      return { language: 'javascript', code: raw }
    }
  }
  return { language: 'javascript', code: STARTER.javascript }
}

function getExtension(lang: CodeLanguage): Extension[] {
  switch (lang) {
    case 'javascript': return [javascript({ jsx: true })]
    case 'typescript': return [javascript({ jsx: true, typescript: true })]
    case 'python':     return [python()]
    case 'html':       return [html()]
    case 'css':        return [css()]
    case 'json':       return [jsonLang()]
    case 'sql':        return [sql()]
    case 'markdown':   return [markdown()]
    default:           return []
  }
}

// ── Execução em sandbox ────────────────────────────────
interface LogEntry {
  kind: 'log' | 'info' | 'warn' | 'error'
  text: string
  ts: number
}

/**
 * Executa JavaScript num iframe sandbox. O iframe intercepta console.*
 * e postMessage com logs + erros de volta para a página.
 */
function buildJsSandboxHtml(code: string, messageId: string): string {
  const safeCode = JSON.stringify(code)
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
  (function(){
    const mid = ${JSON.stringify(messageId)};
    const send = (kind, args) => {
      try {
        const text = args.map(a => {
          if (a instanceof Error) return a.stack || a.message
          if (typeof a === 'object') { try { return JSON.stringify(a, null, 2) } catch { return String(a) } }
          return String(a)
        }).join(' ');
        parent.postMessage({ __flimas: mid, kind, text }, '*');
      } catch(e){}
    };
    ['log','info','warn','error'].forEach(k => {
      const orig = console[k];
      console[k] = (...args) => { send(k, args); try { orig.apply(console, args) } catch(e){} };
    });
    window.addEventListener('error', e => send('error', [e.error || e.message]));
    window.addEventListener('unhandledrejection', e => send('error', ['Unhandled rejection:', e.reason]));
    try {
      const result = (0, eval)(${safeCode});
      if (result !== undefined) send('info', ['← resultado:', result]);
      parent.postMessage({ __flimas: mid, kind: 'done' }, '*');
    } catch (err) {
      send('error', [err]);
      parent.postMessage({ __flimas: mid, kind: 'done' }, '*');
    }
  })();
</script>
</body></html>`
}

export default function CodeEditor({ fileId, initialContent, darkMode, onChange, readOnly }: CodeEditorProps) {
  const parsed = useMemo(() => parseContent(initialContent), [initialContent])
  const [language, setLanguage] = useState<CodeLanguage>(parsed.language)
  const [code, setCode] = useState<string>(parsed.code)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Re-load content when opening a different file
  useEffect(() => {
    const p = parseContent(initialContent)
    setLanguage(p.language)
    setCode(p.code)
    setLogs([])
    setShowPreview(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId])

  // Persist on change
  useEffect(() => {
    const payload: CodeFileContent = { language, code }
    onChangeRef.current(JSON.stringify(payload))
  }, [language, code])

  // Auto-render HTML in side preview
  useEffect(() => {
    if (!showPreview || language !== 'html') return
    const iframe = previewRef.current
    if (!iframe) return
    iframe.srcdoc = code
  }, [code, language, showPreview])

  const langConfig = LANGUAGES.find(l => l.value === language)!
  const runnable = langConfig.runnable

  const extensions = useMemo<Extension[]>(() => getExtension(language), [language])

  const runJs = useCallback(() => {
    setRunning(true)
    setLogs([])
    const messageId = crypto.randomUUID()
    const sandboxHtml = buildJsSandboxHtml(code, messageId)

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { __flimas?: string; kind: string; text?: string }
      if (data?.__flimas !== messageId) return
      if (data.kind === 'done') {
        setRunning(false)
        window.removeEventListener('message', onMessage)
        return
      }
      if (data.text !== undefined) {
        setLogs(prev => [...prev, { kind: data.kind as LogEntry['kind'], text: data.text!, ts: Date.now() }])
      }
    }
    window.addEventListener('message', onMessage)

    const iframe = iframeRef.current
    if (iframe) {
      iframe.srcdoc = sandboxHtml
    }

    // Timeout de segurança: 6s
    setTimeout(() => {
      setRunning(current => {
        if (current) {
          setLogs(prev => [...prev, { kind: 'error', text: '⏱ Execução interrompida após 6s', ts: Date.now() }])
          window.removeEventListener('message', onMessage)
          return false
        }
        return current
      })
    }, 6000)
  }, [code])

  const handleRun = () => {
    if (language === 'javascript') runJs()
    else if (language === 'html') setShowPreview(v => !v)
  }

  const clearLogs = () => setLogs([])

  return (
    <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 144px)' }}>
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-ui)] border-b border-[var(--border-light)] text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Linguagem</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as CodeLanguage)}
            disabled={readOnly}
            className="h-8 px-2 text-xs font-semibold border-none rounded-lg bg-[var(--bg-page)] text-[var(--text-select)] focus:ring-2 ring-violet-500 cursor-pointer"
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>

        <button
          onClick={() => {
            if (confirm('Substituir o código atual pelo template inicial da linguagem?')) {
              setCode(STARTER[language] || '')
            }
          }}
          disabled={readOnly}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"
        >
          Template
        </button>

        <div className="flex-1" />

        {runnable && (
          <button
            onClick={handleRun}
            disabled={running}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {running ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Executando…
              </>
            ) : language === 'html' ? (
              showPreview ? '✕ Fechar preview' : '▶ Preview HTML'
            ) : (
              '▶ Executar'
            )}
          </button>
        )}
        {!runnable && (
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Execução de {langConfig.label} em breve
          </span>
        )}
      </div>

      {/* ── Editor + Output ─────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Code editor */}
        <div className="flex-1 min-w-0 overflow-hidden border-b md:border-b-0 md:border-r border-[var(--border-light)]">
          <CodeMirror
            value={code}
            height="100%"
            theme={darkMode ? oneDark : 'light'}
            extensions={extensions}
            onChange={(v) => setCode(v)}
            readOnly={readOnly}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              bracketMatching: true,
              autocompletion: true,
              closeBrackets: true,
              indentOnInput: true,
              tabSize: 2,
            }}
            style={{ height: '100%', fontSize: 14, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          />
        </div>

        {/* Output panel */}
        <div className="md:w-1/2 flex flex-col bg-[#0b1020] text-slate-100">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>{language === 'html' && showPreview ? 'Preview' : 'Saída'}</span>
            {logs.length > 0 && (
              <button onClick={clearLogs} className="text-[10px] font-bold text-slate-400 hover:text-white">Limpar</button>
            )}
          </div>

          {language === 'html' && showPreview ? (
            <iframe
              ref={previewRef}
              title="HTML preview"
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">
                  {runnable
                    ? `Clique em "▶ Executar" para rodar seu ${langConfig.label}.`
                    : `Nenhuma saída — a execução de ${langConfig.label} ainda não está disponível.`}
                </div>
              ) : (
                logs.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.kind === 'error' ? 'text-rose-400' :
                      l.kind === 'warn'  ? 'text-amber-300' :
                      l.kind === 'info'  ? 'text-sky-300' :
                      'text-slate-100'
                    }
                  >
                    <span className="text-slate-500 mr-2">{l.kind}</span>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{l.text}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden iframe sandbox para execução de JS */}
      <iframe
        ref={iframeRef}
        title="JS sandbox"
        sandbox="allow-scripts"
        style={{ display: 'none' }}
      />
    </div>
  )
}
