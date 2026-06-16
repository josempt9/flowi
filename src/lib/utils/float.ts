import type { Account, CreditCard } from '@/types/finance'

/**
 * Días desde hoy hasta la próxima ocurrencia de un día del mes (1-31).
 * Si el día ya pasó este mes, cuenta para el mes siguiente.
 */
export function daysUntilMonthDay(day: number | null): number | null {
  if (!day) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let target = new Date(today.getFullYear(), today.getMonth(), day)
  if (target < today) {
    target = new Date(today.getFullYear(), today.getMonth() + 1, day)
  }
  const ms = target.getTime() - today.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/**
 * Día límite de pago a partir del día de corte y los días de gracia.
 * Ej.: corte 13 + 20 de gracia → día 2 del mes siguiente.
 */
export function paymentDayFromCut(cutDay: number, graceDays: number): number {
  return ((cutDay + graceDays - 1) % 31) + 1
}

/** Próxima ocurrencia de un día del mes como Date (o null). */
export function nextMonthDayDate(day: number | null): Date | null {
  if (!day) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let target = new Date(today.getFullYear(), today.getMonth(), day)
  if (target < today) target = new Date(today.getFullYear(), today.getMonth() + 1, day)
  return target
}

/** Utilización de la tarjeta: saldo / límite (0 a 1). */
export function cardUtilization(card: CreditCard): number {
  if (!card.credit_limit) return 0
  return Math.min(card.current_balance / card.credit_limit, 1)
}

/**
 * Beneficio del float: rendimiento que el dinero gana mientras la deuda de la
 * tarjeta se mantiene financiada, en lugar de pagarla de inmediato.
 */
export function floatBenefit(
  amountFinanced: number,
  days: number,
  annualYield: number
): number {
  if (amountFinanced <= 0 || days <= 0 || annualYield <= 0) return 0
  return amountFinanced * annualYield * (days / 365)
}

/**
 * Mejor tasa de rendimiento disponible para el usuario, considerando también
 * los apartados (subcuentas) que pueden rendir más que su cuenta padre.
 */
export function bestYieldRate(
  accounts: Account[],
  subaccounts: { yield_rate: number }[] = []
): number {
  const accMax = accounts.reduce((max, a) => Math.max(max, a.yield_rate ?? 0), 0)
  const subMax = subaccounts.reduce((max, s) => Math.max(max, Number(s.yield_rate) || 0), 0)
  return Math.max(accMax, subMax)
}

/** Rendimiento ponderado real de una cuenta con apartados (libre + subcuentas). */
export function weightedAccountYield(
  balance: number,
  accountYield: number,
  subs: { balance: number; yield_rate: number }[]
): number {
  const subSum = subs.reduce((s, x) => s + Number(x.balance), 0)
  const free = Math.max(balance - subSum, 0)
  const total = free + subSum
  if (total <= 0) return accountYield
  const weighted =
    free * accountYield + subs.reduce((s, x) => s + Number(x.balance) * Number(x.yield_rate), 0)
  return weighted / total
}

export interface CardFloat {
  card: CreditCard
  utilization: number
  daysToPayment: number | null
  benefit: number
}

export interface CardRecommendation {
  card: CreditCard
  days: number
  benefit: number
}

/**
 * Recomienda la tarjeta que maximiza el float para una compra: la que tiene más
 * días hasta su pago. Devuelve null si no hay tarjetas con fecha de pago.
 */
export function recommendCardForExpense(
  amount: number,
  cards: CreditCard[],
  accounts: Account[],
  subaccounts: { yield_rate: number }[] = []
): CardRecommendation | null {
  const yieldRate = bestYieldRate(accounts, subaccounts)
  let best: CardRecommendation | null = null
  for (const card of cards) {
    const days = daysUntilMonthDay(card.payment_day)
    if (days === null) continue
    if (!best || days > best.days) {
      best = { card, days, benefit: floatBenefit(amount, days, yieldRate) }
    }
  }
  return best
}

/** Calcula el float de una tarjeta usando la mejor tasa disponible. */
export function computeCardFloat(
  card: CreditCard,
  accounts: Account[],
  subaccounts: { yield_rate: number }[] = []
): CardFloat {
  const daysToPayment = daysUntilMonthDay(card.payment_day)
  const yieldRate = bestYieldRate(accounts, subaccounts)
  const benefit = floatBenefit(card.current_balance, daysToPayment ?? 0, yieldRate)
  return {
    card,
    utilization: cardUtilization(card),
    daysToPayment,
    benefit,
  }
}
