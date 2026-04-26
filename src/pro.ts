/**
 * Plano Flimas Pro — R$ 19,90/mês.
 *
 * O status de Pro AGORA vive no registro do usuário (`user.isPro`), gerenciado por
 * `src/auth.ts`. Esta camada apenas re-exporta os helpers cosméticos (preço, label,
 * lista de benefícios) e o predicado `canCreate`, que recebe o `isPro` do usuário
 * atual como parâmetro.
 *
 * O admin pode liberar Pro pra qualquer usuário pelo Painel Admin (modo dev até
 * existir cobrança real). Quando ligarmos um backend (Supabase / Firebase),
 * `user.isPro` virá do banco em vez do localStorage — esta API não muda.
 */
import type { FileKind } from './types'

export const PRO_PRICE_BRL = 19.90
export const PRO_PRICE_LABEL = 'R$ 19,90/mês'

export const PRO_BENEFITS: { title: string; subtitle: string }[] = [
  { title: 'Flimas Code', subtitle: 'Editor profissional com syntax highlight, snippets e múltiplas linguagens.' },
  { title: 'Flimas Studio', subtitle: 'Edição de imagem em camadas — filtros, texto, formas e exportação PNG/JPEG/PDF.' },
  { title: 'Suporte prioritário', subtitle: 'Resposta em até 24h pelo e-mail de suporte.' },
  { title: 'Sem anúncios', subtitle: 'Workspace 100% limpo agora e sempre.' },
]

/** Avalia se o usuário pode criar um arquivo do tipo `kind` com o plano informado. */
export function canCreate(kind: FileKind, isPro: boolean): boolean {
  if (kind === 'code' || kind === 'image') return isPro
  return true
}
