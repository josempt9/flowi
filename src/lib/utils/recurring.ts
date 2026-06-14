import type { Transaction } from '@/types/finance'
import { displayInflow } from '@/lib/utils/transactions'

export interface RecurringExpense {
  label: string
  count: number
  avgAmount: number
  periodicity: 'semanal' | 'mensual'
  monthlyCost: number
}

// Normaliza una descripción a una clave de agrupación (sin acentos/números, 2 palabras).
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0-9$.,#]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
}

/**
 * Detecta gastos recurrentes: agrupa salidas por descripción similar (primeras
 * palabras), estima periodicidad por el espaciado promedio entre fechas y
 * proyecta el costo mensual. Analiza los últimos ~120 días.
 */
export function detectRecurring(transactions: Transaction[]): RecurringExpense[] {
  const cutoffMs = 120 * 86_400_000
  const now = Date.now()
  const outflows = transactions.filter(
    (t) =>
      !displayInflow(t) &&
      t.type !== 'transfer' &&
      now - new Date(t.date).getTime() <= cutoffMs
  )

  const groups = new Map<string, Transaction[]>()
  for (const t of outflows) {
    const key = normalizeKey(t.description || t.ai_category || '')
    if (!key) continue
    const arr = groups.get(key) ?? []
    arr.push(t)
    groups.set(key, arr)
  }

  const result: RecurringExpense[] = []
  for (const txs of groups.values()) {
    if (txs.length < 2) continue
    const dates = txs.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b)
    let gapSum = 0
    for (let i = 1; i < dates.length; i++) gapSum += (dates[i] - dates[i - 1]) / 86_400_000
    const avgGap = gapSum / (dates.length - 1)
    const avgAmount = txs.reduce((s, t) => s + Number(t.amount), 0) / txs.length

    let periodicity: 'semanal' | 'mensual'
    let monthlyCost: number
    if (avgGap >= 4 && avgGap <= 10) {
      periodicity = 'semanal'
      monthlyCost = avgAmount * 4.33
    } else if (avgGap >= 20 && avgGap <= 40) {
      periodicity = 'mensual'
      monthlyCost = avgAmount
    } else {
      continue
    }

    result.push({
      label: txs[txs.length - 1].description || txs[txs.length - 1].ai_category || 'Gasto',
      count: txs.length,
      avgAmount,
      periodicity,
      monthlyCost,
    })
  }

  return result.sort((a, b) => b.monthlyCost - a.monthlyCost)
}
