import type { Account, CreditCard, Subaccount } from '@/types/finance'
import { daysUntilMonthDay } from '@/lib/utils/float'

export type PaymentUrgency = 'critical' | 'warning' | 'safe' | 'none'

/** Deuda total de una TDC = ciclo actual (CP) + ciclo anterior (MP / 2do corte). */
export function cardDebt(card: CreditCard): number {
  return Number(card.current_balance) + Number(card.previous_balance ?? 0)
}

/**
 * Urgencia de pago según días hasta la fecha límite:
 * critical 0-3 (rojo), warning 4-7 (amarillo), safe 8+ (verde), none si no hay deuda.
 */
export function getPaymentUrgency(card: CreditCard): PaymentUrgency {
  if (cardDebt(card) <= 0) return 'none'
  const days = daysUntilMonthDay(card.payment_day)
  if (days === null) return 'none'
  if (days <= 3) return 'critical'
  if (days <= 7) return 'warning'
  return 'safe'
}

function sumAccounts(accounts: Account[]): number {
  return accounts.reduce((s, a) => s + Number(a.balance), 0)
}
function sumSub(subs: Subaccount[]): number {
  return subs.reduce((s, x) => s + Number(x.balance), 0)
}
function sumCP(cards: CreditCard[]): number {
  return cards.reduce((s, c) => s + Number(c.current_balance), 0)
}
function sumMP(cards: CreditCard[]): number {
  return cards.reduce((s, c) => s + Number(c.previous_balance ?? 0), 0)
}

/** Caja libre = líquido disponible (cuentas − apartados) − deuda CP a pagar. */
export function calculateFreeCash(
  accounts: Account[],
  subaccounts: Subaccount[],
  cards: CreditCard[]
): number {
  const available = sumAccounts(accounts) - sumSub(subaccounts)
  return available - sumCP(cards)
}

export interface CPCoverage {
  liquidBalance: number // líquido disponible (cuentas − apartados)
  cpDebt: number // deuda del ciclo actual
  mpDebt: number // deuda del ciclo anterior (2do corte)
  canCoverCP: boolean
  canCoverAll: boolean
  freeCash: number
  coverageRatio: number
}

/** Cobertura del ciclo actual: cuánto del CP puedes pagar con tu líquido disponible. */
export function calculateCPCoverage(
  accounts: Account[],
  subaccounts: Subaccount[],
  cards: CreditCard[]
): CPCoverage {
  const liquidBalance = sumAccounts(accounts) - sumSub(subaccounts)
  const cpDebt = sumCP(cards)
  const mpDebt = sumMP(cards)
  return {
    liquidBalance,
    cpDebt,
    mpDebt,
    canCoverCP: liquidBalance >= cpDebt,
    canCoverAll: liquidBalance >= cpDebt + mpDebt,
    freeCash: liquidBalance - cpDebt,
    coverageRatio: cpDebt > 0 ? liquidBalance / cpDebt : 1,
  }
}

/** Agrupa TDCs (con deuda) por urgencia para el semáforo, ordenadas por días. */
export function groupCardsByUrgency(cards: CreditCard[]): {
  critical: CreditCard[]
  warning: CreditCard[]
  safe: CreditCard[]
} {
  const critical: CreditCard[] = []
  const warning: CreditCard[] = []
  const safe: CreditCard[] = []
  for (const c of cards) {
    const u = getPaymentUrgency(c)
    if (u === 'critical') critical.push(c)
    else if (u === 'warning') warning.push(c)
    else if (u === 'safe') safe.push(c)
  }
  const byDays = (a: CreditCard, b: CreditCard) =>
    (daysUntilMonthDay(a.payment_day) ?? 99) - (daysUntilMonthDay(b.payment_day) ?? 99)
  return {
    critical: critical.sort(byDays),
    warning: warning.sort(byDays),
    safe: safe.sort(byDays),
  }
}
