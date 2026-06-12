import type { Account, Budget, CreditCard, Transaction } from '@/types/finance'
import { cardUtilization } from '@/lib/utils/float'
import { displayInflow } from '@/lib/utils/transactions'

export interface FinancialScore {
  total: number // 0-100
  savings: number
  runway: number
  utilization: number
  budget: number
  runwayMonths: number
  savingsRate: number
  label: string
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

function withinDays(dateStr: string, days: number): boolean {
  return Date.now() - new Date(dateStr).getTime() <= days * 86_400_000
}

function scoreLabel(total: number): string {
  if (total >= 80) return 'Excelente'
  if (total >= 65) return 'Saludable'
  if (total >= 45) return 'Aceptable'
  if (total >= 25) return 'Frágil'
  return 'En riesgo'
}

/**
 * Score financiero personal (1-100) a partir de los datos disponibles.
 * Ponderación: ahorro 35%, colchón de liquidez 30%, uso de crédito 20%, presupuestos 15%.
 */
export function computeScore(params: {
  accounts: Account[]
  cards: CreditCard[]
  transactions: Transaction[]
  budgets: Budget[]
}): FinancialScore {
  const { accounts, cards, transactions, budgets } = params

  const liquid = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const last30 = transactions.filter((t) => withinDays(t.date, 30) && t.type !== 'transfer')
  const income = last30.filter((t) => displayInflow(t)).reduce((s, t) => s + Number(t.amount), 0)
  const expense = last30.filter((t) => !displayInflow(t)).reduce((s, t) => s + Number(t.amount), 0)

  // 1. Tasa de ahorro (50% del ingreso = puntaje completo)
  const savingsRate = income > 0 ? (income - expense) / income : 0
  const savings = income > 0 ? clamp((savingsRate / 0.5) * 100) : 50

  // 2. Colchón de liquidez (6 meses de gasto = completo)
  const runwayMonths = expense > 0 ? liquid / expense : 12
  const runway = clamp((runwayMonths / 6) * 100)

  // 3. Uso de crédito (menor utilización = mejor)
  const activeCards = cards.filter((c) => Number(c.credit_limit) > 0)
  const avgUtil =
    activeCards.length > 0
      ? activeCards.reduce((s, c) => s + cardUtilization(c), 0) / activeCards.length
      : 0
  const utilization = clamp((1 - avgUtil) * 100)

  // 4. Adherencia a presupuestos
  const spentByCat = new Map<string, number>()
  for (const t of last30) {
    if (displayInflow(t)) continue
    const cat = t.ai_category || 'General'
    spentByCat.set(cat, (spentByCat.get(cat) ?? 0) + Number(t.amount))
  }
  const activeBudgets = budgets.filter((b) => Number(b.amount) > 0)
  const budget =
    activeBudgets.length > 0
      ? activeBudgets.reduce((s, b) => {
          const spent = spentByCat.get(b.category) ?? 0
          const ratio = spent / Number(b.amount)
          return s + (ratio <= 1 ? 100 : clamp(100 - (ratio - 1) * 100))
        }, 0) / activeBudgets.length
      : 50

  const total = Math.round(savings * 0.35 + runway * 0.3 + utilization * 0.2 + budget * 0.15)

  return {
    total,
    savings: Math.round(savings),
    runway: Math.round(runway),
    utilization: Math.round(utilization),
    budget: Math.round(budget),
    runwayMonths,
    savingsRate,
    label: scoreLabel(total),
  }
}
