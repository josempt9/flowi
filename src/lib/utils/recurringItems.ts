import type { RecurringItem } from '@/types/finance'

/** Próxima fecha de ocurrencia de un recurrente (o null si no se puede calcular). */
export function nextOccurrenceDate(item: RecurringItem): Date | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (item.frequency === 'weekly' && item.day_of_week != null) {
    const diff = (item.day_of_week - today.getDay() + 7) % 7
    const d = new Date(today)
    d.setDate(today.getDate() + diff)
    return d
  }

  const days = item.day_of_month ?? []
  if (!days.length) return null
  let best: Date | null = null
  for (let off = 0; off <= 1; off++) {
    for (const day of days) {
      const d = new Date(today.getFullYear(), today.getMonth() + off, day)
      if (d >= today && (!best || d < best)) best = d
    }
  }
  return best
}

export function daysUntilDate(d: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

/** Cuántas veces ocurre el recurrente dentro de los próximos `days` días. */
export function occurrencesInWindow(item: RecurringItem, days: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(today.getDate() + days)

  if (item.frequency === 'weekly' && item.day_of_week != null) {
    let count = 0
    for (let i = 0; i <= days; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      if (d.getDay() === item.day_of_week) count++
    }
    return count
  }

  const dom = item.day_of_month ?? []
  let count = 0
  for (let off = 0; off <= Math.ceil(days / 28) + 1; off++) {
    for (const day of dom) {
      const d = new Date(today.getFullYear(), today.getMonth() + off, day)
      if (d >= today && d <= end) count++
    }
  }
  return count
}

/** Monto con signo: ingresos +, gastos −. */
export function recurringSign(item: RecurringItem): number {
  return item.type === 'income' ? Number(item.amount) : -Number(item.amount)
}

/** Impacto mensual estimado con signo (para proyecciones rápidas). */
export function monthlyImpact(item: RecurringItem): number {
  const perMonth =
    item.frequency === 'weekly'
      ? 4.33
      : item.frequency === 'biweekly'
        ? 2
        : (item.day_of_month?.length ?? 1) || 1
  return recurringSign(item) * perMonth
}

/** Neto (ingresos − gastos) de los recurrentes activos en los próximos `days` días. */
export function recurringNetInDays(items: RecurringItem[], days: number): number {
  return items
    .filter((i) => i.is_active)
    .reduce((s, i) => s + occurrencesInWindow(i, days) * recurringSign(i), 0)
}

const FREQ_LABEL: Record<RecurringItem['frequency'], string> = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
  weekly: 'Semanal',
  custom: 'Personalizado',
}

export function frequencyLabel(item: RecurringItem): string {
  if (item.day_of_month && item.day_of_month.length) {
    return `Día ${item.day_of_month.join(' y ')} de cada mes`
  }
  return FREQ_LABEL[item.frequency]
}
