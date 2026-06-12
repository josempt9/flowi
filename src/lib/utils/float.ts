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

/** Mejor tasa de rendimiento disponible entre las cuentas líquidas del usuario. */
export function bestYieldRate(accounts: Account[]): number {
  return accounts.reduce((max, a) => Math.max(max, a.yield_rate ?? 0), 0)
}

export interface CardFloat {
  card: CreditCard
  utilization: number
  daysToPayment: number | null
  benefit: number
}

/** Calcula el float de una tarjeta usando la mejor tasa disponible. */
export function computeCardFloat(card: CreditCard, accounts: Account[]): CardFloat {
  const daysToPayment = daysUntilMonthDay(card.payment_day)
  const yieldRate = bestYieldRate(accounts)
  const benefit = floatBenefit(card.current_balance, daysToPayment ?? 0, yieldRate)
  return {
    card,
    utilization: cardUtilization(card),
    daysToPayment,
    benefit,
  }
}
