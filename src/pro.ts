/**
 * Plano Flimas Pro — R$ 19,90/mês.
 * Por enquanto não há backend de billing: o status fica em localStorage e
 * pode ser ativado/desativado em modo dev pelo SettingsModal.
 *
 * O paywall é leve e gracioso — usuários sem Pro veem badges, podem ver
 * arquivos existentes em modo readonly, mas não criam novos do tipo Pro.
 */
import type { FileKind } from './types'

export const PRO_PRICE_BRL = 19.90
export const PRO_PRICE_LABEL = 'R$ 19,90/mês'
export const PRO_KEY = 'flimas_pro_v1'

export interface ProState {
  active: boolean
  /** ISO de quando foi ativado (informativo, sem cobrança real ainda). */
  since?: string
}

export function loadPro(): ProState {
  try {
    const raw = localStorage.getItem(PRO_KEY)
    if (!raw) return { active: false }
    const parsed = JSON.parse(raw) as Partial<ProState>
    return { active: !!parsed.active, since: parsed.since }
  } catch {
    return { active: false }
  }
}

export function savePro(state: ProState): void {
  try {
    localStorage.setItem(PRO_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export const PRO_BENEFITS: { title: string; subtitle: string }[] = [
  { title: 'Flimas Code', subtitle: 'Editor profissional com syntax highlight, snippets e múltiplas linguagens.' },
  { title: 'Flimas Studio', subtitle: 'Edição de imagem em camadas — filtros, texto, formas e exportação PNG/JPEG/PDF.' },
  { title: 'Suporte prioritário', subtitle: 'Resposta em até 24h pelo e-mail de suporte.' },
  { title: 'Sem anúncios', subtitle: 'Workspace 100% limpo agora e sempre.' },
]

/** Lê o status atual considerando overrides em runtime (passados por contexto/props). */
export function canCreate(kind: FileKind, isPro: boolean): boolean {
  if (kind === 'code' || kind === 'image') return isPro
  return true
}
