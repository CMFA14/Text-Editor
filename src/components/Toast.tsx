import { useEffect, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

/**
 * Sistema de toasts simples (sem dependência externa).
 * Uso:
 *   import { toast } from './components/Toast'
 *   toast.success('Salvo com sucesso')
 *   toast.error('Falha ao importar')
 *
 * É necessário renderizar <ToastHost /> uma vez no topo do app.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  duration: number
}

type Listener = (items: ToastItem[]) => void

let counter = 0
const listeners = new Set<Listener>()
let queue: ToastItem[] = []

function notify() {
  for (const l of listeners) l(queue)
}

function push(kind: ToastKind, message: string, duration = 3500) {
  const item: ToastItem = { id: ++counter, kind, message, duration }
  queue = [...queue, item]
  notify()
  if (duration > 0) {
    setTimeout(() => dismiss(item.id), duration)
  }
  return item.id
}

function dismiss(id: number) {
  queue = queue.filter(t => t.id !== id)
  notify()
}

export const toast = {
  success: (message: string, duration?: number) => push('success', message, duration),
  error:   (message: string, duration?: number) => push('error',   message, duration ?? 5000),
  info:    (message: string, duration?: number) => push('info',    message, duration),
  warning: (message: string, duration?: number) => push('warning', message, duration),
  dismiss,
}

const KIND_STYLES: Record<ToastKind, { icon: typeof Info; ring: string; bg: string; text: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-200 dark:ring-emerald-900/50',
    bg:   'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    ring: 'ring-rose-200 dark:ring-rose-900/50',
    bg:   'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
    iconColor: 'text-rose-500',
  },
  info: {
    icon: Info,
    ring: 'ring-sky-200 dark:ring-sky-900/50',
    bg:   'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
    iconColor: 'text-sky-500',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-200 dark:ring-amber-900/50',
    bg:   'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
    iconColor: 'text-amber-500',
  },
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>(queue)
  const mounted = useRef(true)

  useEffect(() => {
    const l: Listener = (next) => { if (mounted.current) setItems(next) }
    listeners.add(l)
    return () => { mounted.current = false; listeners.delete(l) }
  }, [])

  const onDismiss = useCallback((id: number) => dismiss(id), [])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-[200] right-4 bottom-4 flex flex-col gap-2 pointer-events-none max-w-[92vw] w-[320px]"
    >
      {items.map(item => {
        const style = KIND_STYLES[item.kind]
        const Icon = style.icon
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg ring-1
              ${style.bg} ${style.text} ${style.ring}
              border border-[var(--border-light)]
              animate-toast-in`}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 text-sm font-semibold leading-snug min-w-0 break-words">
              {item.message}
            </div>
            <button
              onClick={() => onDismiss(item.id)}
              className="shrink-0 w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .animate-toast-in { animation: toast-in 0.18s ease-out both; }
        body.reduced-motion .animate-toast-in { animation: none; }
      `}</style>
    </div>
  )
}
