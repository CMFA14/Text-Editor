import { Crown, Lock } from 'lucide-react'

/**
 * Selo "PRO" — usado em produtos exclusivos do plano Flimas Pro.
 * Tamanhos:
 *  - 'xs': inline (ao lado de títulos de botões)
 *  - 'sm': cards/listas
 *  - 'md': hero / cabeçalhos
 */
export type ProBadgeSize = 'xs' | 'sm' | 'md'

interface ProBadgeProps {
  size?: ProBadgeSize
  /** Use 'lock' para ícone de cadeado (recurso bloqueado), 'crown' para coroa (recurso Pro). */
  variant?: 'crown' | 'lock'
  className?: string
  label?: string
}

export default function ProBadge({
  size = 'sm',
  variant = 'crown',
  className = '',
  label = 'PRO',
}: ProBadgeProps) {
  const sizing =
    size === 'xs' ? 'text-[9px] px-1.5 py-0.5 gap-0.5'  :
    size === 'md' ? 'text-xs   px-2.5 py-1   gap-1.5'   :
                    'text-[10px] px-2 py-0.5 gap-1'

  const iconSize = size === 'xs' ? 9 : size === 'md' ? 13 : 11
  const Icon = variant === 'lock' ? Lock : Crown

  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase tracking-widest rounded-md
        bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500
        text-white shadow-sm shadow-amber-500/30 ring-1 ring-amber-300/40
        ${sizing} ${className}`}
      aria-label={`Recurso ${label}`}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
      {label}
    </span>
  )
}
