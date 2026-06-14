import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const mxnCompact = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

/** Formatea un monto como moneda mexicana, p. ej. $1,234.50 */
export function formatMXN(amount: number): string {
  return mxn.format(amount ?? 0)
}

/** Versión sin centavos para cifras grandes (patrimonio, límites). */
export function formatMXNCompact(amount: number): string {
  return mxnCompact.format(amount ?? 0)
}

/** Porcentaje legible, p. ej. 0.153 -> "15.3%" */
export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

/** Fecha corta en español, p. ej. "11 jun" */
export function formatShortDate(date: string | Date): string {
  return format(new Date(date), "d 'de' MMM", { locale: es })
}

/** Fecha relativa, p. ej. "hace 3 horas" */
export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

/** Próxima ocurrencia de un día del mes como fecha legible, p. ej. "13 de julio 2026". */
export function formatNextMonthDay(day: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let target = new Date(today.getFullYear(), today.getMonth(), day)
  if (target < today) target = new Date(today.getFullYear(), today.getMonth() + 1, day)
  return format(target, "d 'de' MMMM yyyy", { locale: es })
}
