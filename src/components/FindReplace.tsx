import { useState, useCallback, useEffect } from 'react'
import { Editor } from '@tiptap/react'

interface FindReplaceProps {
  editor: Editor | null
  onClose: () => void
}

export default function FindReplace({ editor, onClose }: FindReplaceProps) {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const [matches, setMatches] = useState<{ from: number; to: number }[]>([])

  const findMatches = useCallback(() => {
    if (!editor || !findText) {
      setMatches([])
      setMatchCount(0)
      setCurrentMatch(0)
      return
    }

    const { doc } = editor.state
    const found: { from: number; to: number }[] = []
    const searchStr = caseSensitive ? findText : findText.toLowerCase()

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase()
        let index = 0
        while (true) {
          const idx = text.indexOf(searchStr, index)
          if (idx === -1) break
          found.push({ from: pos + idx, to: pos + idx + searchStr.length })
          index = idx + 1
        }
      }
    })

    setMatches(found)
    setMatchCount(found.length)
    setCurrentMatch(found.length > 0 ? 1 : 0)

    if (found.length > 0) {
      editor.commands.setTextSelection({ from: found[0].from, to: found[0].to })
      editor.commands.scrollIntoView()
    }
  }, [editor, findText, caseSensitive])

  useEffect(() => {
    findMatches()
  }, [findMatches])

  const goToMatch = useCallback((direction: 'next' | 'prev') => {
    if (matches.length === 0) return
    const next = direction === 'next'
      ? (currentMatch % matches.length) + 1
      : (currentMatch - 2 + matches.length) % matches.length + 1
    setCurrentMatch(next)
    const match = matches[next - 1]
    editor?.commands.setTextSelection({ from: match.from, to: match.to })
    editor?.commands.scrollIntoView()
  }, [matches, currentMatch, editor])

  const replaceOne = () => {
    if (!editor || matches.length === 0) return
    const match = matches[currentMatch - 1]
    editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).deleteSelection().insertContent(replaceText).run()
    findMatches()
  }

  const replaceAll = () => {
    if (!editor || !findText) return
    const { doc } = editor.state
    const found: { from: number; to: number }[] = []
    const searchStr = caseSensitive ? findText : findText.toLowerCase()

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase()
        let index = 0
        while (true) {
          const idx = text.indexOf(searchStr, index)
          if (idx === -1) break
          found.push({ from: pos + idx, to: pos + idx + searchStr.length })
          index = idx + 1
        }
      }
    })

    // Replace in reverse order to not mess up positions
    const chain = editor.chain().focus()
    ;[...found].reverse().forEach(({ from, to }) => {
      chain.setTextSelection({ from, to }).deleteSelection().insertContent(replaceText)
    })
    chain.run()
    setMatchCount(0)
    setCurrentMatch(0)
    setMatches([])
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && !e.shiftKey) goToMatch('next')
      if (e.key === 'Enter' && e.shiftKey) goToMatch('prev')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goToMatch, onClose])

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-64">
        <span className="text-gray-500 text-sm font-medium whitespace-nowrap">🔍 Localizar:</span>
        <div className="relative flex-1">
          <input
            type="text"
            value={findText}
            onChange={e => setFindText(e.target.value)}
            placeholder="Texto a localizar..."
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
            autoFocus
          />
          {matchCount > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded">
              {currentMatch}/{matchCount}
            </span>
          )}
        </div>
        <button onClick={() => goToMatch('prev')} disabled={matchCount === 0}
          className="w-7 h-7 rounded border border-gray-200 hover:bg-violet-50 text-gray-600 disabled:opacity-40 flex items-center justify-center">↑</button>
        <button onClick={() => goToMatch('next')} disabled={matchCount === 0}
          className="w-7 h-7 rounded border border-gray-200 hover:bg-violet-50 text-gray-600 disabled:opacity-40 flex items-center justify-center">↓</button>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-64">
        <span className="text-gray-500 text-sm font-medium whitespace-nowrap">✏️ Substituir:</span>
        <input
          type="text"
          value={replaceText}
          onChange={e => setReplaceText(e.target.value)}
          placeholder="Substituir por..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        />
        <button onClick={replaceOne} disabled={matchCount === 0}
          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 font-medium">
          Substituir
        </button>
        <button onClick={replaceAll} disabled={matchCount === 0}
          className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 font-medium">
          Substituir todos
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)}
            className="accent-violet-600" />
          Aa
        </label>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center text-lg">✕</button>
      </div>

      {findText && matchCount === 0 && (
        <span className="text-xs text-red-500 w-full">Nenhum resultado encontrado.</span>
      )}
    </div>
  )
}
