'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, X } from 'lucide-react'
import { formatMXN } from '@/lib/utils/format'
import { displayInflow } from '@/lib/utils/transactions'
import { computeCardFloat, daysUntilMonthDay } from '@/lib/utils/float'
import type { Account, CreditCard, Transaction } from '@/types/finance'

const STORAGE_KEY = 'flowi:weekly-dismissed'

// Clave de semana ISO (año-Wnn) para recordar el descarte por semana.
function weekKey(ms: number): string {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  const weekNo =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  return `${date.getFullYear()}-W${weekNo}`
}

/**
 * Banner de resumen semanal (client-side, sin push/cron): gasto vs semana
 * anterior, categoría top, float generado y próximo pago. Descartable, una vez
 * por semana (recuerda el descarte en localStorage).
 */
export function WeeklySummaryBanner({
  transactions,
  cards,
  accounts,
}: {
  transactions: Transaction[]
  cards: CreditCard[]
  accounts: Account[]
}) {
  const currentWeek = weekKey(Date.now())
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === currentWeek)
    } catch {
      setDismissed(false)
    }
  }, [currentWeek])

  const now = Date.now()
  let thisWeek = 0
  let lastWeek = 0
  const catSpend = new Map<string, number>()
  for (const t of transactions) {
    if (displayInflow(t) || t.type === 'transfer') continue
    const age = (now - new Date(t.date).getTime()) / 86_400_000
    if (age <= 7) {
      thisWeek += Number(t.amount)
      const c = t.ai_category || 'General'
      catSpend.set(c, (catSpend.get(c) ?? 0) + Number(t.amount))
    } else if (age <= 14) {
      lastWeek += Number(t.amount)
    }
  }
  const topCat = [...catSpend.entries()].sort((a, b) => b[1] - a[1])[0]
  const floatTotal = cards.reduce((s, c) => s + computeCardFloat(c, accounts).benefit, 0)
  const nextPay = cards
    .filter((c) => Number(c.current_balance) > 0)
    .map((c) => daysUntilMonthDay(c.payment_day))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0]

  if (dismissed) return null
  if (thisWeek === 0 && lastWeek === 0) return null

  const delta = thisWeek - lastWeek
  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, currentWeek)
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
      <div className="flex items-start justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Resumen de la semana
        </h2>
        <button onClick={close} aria-label="Cerrar" className="text-gray-400 hover:text-black">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2 space-y-1 text-sm text-gray-600">
        <p>
          Gastaste <span className="font-semibold text-gray-900">{formatMXN(thisWeek)}</span>
          {lastWeek > 0 && (
            <>
              {' '}
              ({delta >= 0 ? '+' : ''}
              {formatMXN(delta)} vs semana pasada)
            </>
          )}
          .
        </p>
        {topCat && (
          <p>
            Mayor gasto: <span className="font-semibold text-gray-900">{topCat[0]}</span> (
            {formatMXN(topCat[1])}).
          </p>
        )}
        {floatTotal > 0 && (
          <p>
            Float generado: <span className="font-semibold text-gray-900">{formatMXN(floatTotal)}</span>.
          </p>
        )}
        {nextPay !== undefined && (
          <p>
            Próximo pago de tarjeta en{' '}
            <span className="font-semibold text-gray-900">{nextPay} días</span>.
          </p>
        )}
      </div>
    </section>
  )
}
