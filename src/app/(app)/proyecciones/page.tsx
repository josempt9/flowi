'use client'

import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useTransactions } from '@/hooks/useTransactions'
import { formatMXN } from '@/lib/utils/format'
import { daysUntilMonthDay } from '@/lib/utils/float'
import { isInflow } from '@/lib/utils/transactions'
import { PageHeader } from '@/components/shared/PageHeader'

type Scenario = 'pesimista' | 'base' | 'optimista'

const SCENARIOS: { value: Scenario; label: string; factor: number }[] = [
  { value: 'pesimista', label: 'Pesimista', factor: 0.85 },
  { value: 'base', label: 'Base', factor: 1 },
  { value: 'optimista', label: 'Optimista', factor: 1.15 },
]

const HORIZONS = [
  { months: 1, label: '30 días' },
  { months: 2, label: '60 días' },
  { months: 3, label: '90 días' },
]

function withinDays(dateStr: string, days: number): boolean {
  const d = new Date(dateStr).getTime()
  const now = Date.now()
  return now - d <= days * 24 * 60 * 60 * 1000
}

export default function ProyeccionesPage() {
  const { accounts, loading: la } = useAccounts()
  const { cards, loading: lc } = useCards()
  const { transactions, loading: lt } = useTransactions()
  const [scenario, setScenario] = useState<Scenario>('base')

  const loading = la || lc || lt
  const factor = SCENARIOS.find((s) => s.value === scenario)!.factor

  const liquid = accounts.reduce((s, a) => s + Number(a.balance), 0)

  // Tendencia histórica (últimos 90 días → promedio mensual)
  const last90 = transactions.filter((t) => withinDays(t.date, 90) && t.type !== 'transfer')
  const inflow90 = last90.filter((t) => isInflow(t.type)).reduce((s, t) => s + Number(t.amount), 0)
  const outflow90 = last90.filter((t) => !isInflow(t.type)).reduce((s, t) => s + Number(t.amount), 0)
  const monthlyIncome = inflow90 / 3
  const monthlyExpense = outflow90 / 3
  const monthlyNet = (monthlyIncome - monthlyExpense) * factor

  // Compromisos de tarjetas dentro de cada horizonte
  const commitmentWithin = (days: number) =>
    cards.reduce((s, c) => {
      const d = daysUntilMonthDay(c.payment_day)
      return d !== null && d <= days ? s + Number(c.current_balance) : s
    }, 0)

  const projections = HORIZONS.map((h) => {
    const trend = monthlyNet * h.months
    const cardOut = commitmentWithin(h.months * 30)
    return { ...h, projected: liquid + trend, afterCards: liquid + trend - cardOut, cardOut }
  })

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader title="Proyecciones" subtitle="Liquidez a futuro" />

      {/* Selector de escenario */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {SCENARIOS.map((s) => (
          <button
            key={s.value}
            onClick={() => setScenario(s.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              scenario === s.value ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 bg-white border border-gray-100 rounded-2xl animate-pulse" />
      ) : (
        <>
          {/* Liquidez actual */}
          <div className="bg-black text-white rounded-2xl p-5 mb-4">
            <p className="text-sm text-gray-300">Liquidez actual</p>
            <p className="text-3xl font-bold mt-1">{formatMXN(liquid)}</p>
          </div>

          {/* Proyecciones por horizonte */}
          <div className="space-y-3">
            {projections.map((p) => (
              <div key={p.months} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">A {p.label}</span>
                  <span className="text-lg font-bold text-gray-900">{formatMXN(p.projected)}</span>
                </div>
                {p.cardOut > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Tras pagar tarjetas</span>
                    <span className={p.afterCards < 0 ? 'text-red-500 font-medium' : 'text-gray-600 font-medium'}>
                      {formatMXN(p.afterCards)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Compromisos de tarjetas */}
          {cards.some((c) => Number(c.current_balance) > 0) && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Compromisos de tarjetas</h2>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
                {cards
                  .filter((c) => Number(c.current_balance) > 0)
                  .map((c) => {
                    const d = daysUntilMonthDay(c.payment_day)
                    return (
                      <div key={c.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            {d !== null ? `Pago en ${d} días` : 'Sin fecha de pago'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatMXN(Number(c.current_balance))}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}

          {/* Supuestos */}
          <div className="mt-6 bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Supuestos del modelo</p>
            <p>Ingreso mensual estimado: {formatMXN(monthlyIncome)}</p>
            <p>Gasto mensual estimado: {formatMXN(monthlyExpense)}</p>
            <p>Basado en la tendencia de tus últimos 90 días, ajustada al escenario {scenario}.</p>
          </div>
        </>
      )}
    </div>
  )
}
