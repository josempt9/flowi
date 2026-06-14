'use client'

import Link from 'next/link'
import { AlertTriangle, Repeat, TrendingUp } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { ESSENTIAL_CATEGORIES } from '@/lib/constants'
import { formatMXN, formatMXNCompact } from '@/lib/utils/format'
import { displayInflow, isInflow } from '@/lib/utils/transactions'
import { computeScore } from '@/lib/utils/score'
import { detectRecurring } from '@/lib/utils/recurring'
import { LineChart } from '@/components/shared/LineChart'
import { PageHeader } from '@/components/shared/PageHeader'

const HORMIGA_THRESHOLD = 150 // gastos pequeños individuales

function inCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export default function DashboardPage() {
  const { transactions, loading } = useTransactions()
  const { budgets } = useBudgets()
  const { accounts } = useAccounts()
  const { cards } = useCards()

  // Las transferencias son movimientos internos: no son ingreso ni gasto.
  const month = transactions.filter((t) => inCurrentMonth(t.date) && t.type !== 'transfer')
  const income = month.filter((t) => isInflow(t.type)).reduce((s, t) => s + Number(t.amount), 0)
  const expense = month.filter((t) => !isInflow(t.type)).reduce((s, t) => s + Number(t.amount), 0)
  const savings = income - expense
  const savingsRate = income > 0 ? savings / income : 0

  // Gastos por categoría
  const byCategory = new Map<string, number>()
  for (const t of month) {
    if (isInflow(t.type)) continue
    const cat = t.ai_category || 'General'
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(t.amount))
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  const maxCat = categories[0]?.[1] ?? 0

  // Presupuestos en riesgo (>=80% del límite mensual)
  const budgetAlerts = budgets
    .filter((b) => Number(b.amount) > 0)
    .map((b) => ({
      cat: b.category,
      budget: Number(b.amount),
      spent: byCategory.get(b.category) ?? 0,
    }))
    .filter((x) => x.spent / x.budget >= 0.8)
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget)

  // Gastos hormiga: pequeños y en categorías no esenciales
  const essential = new Set<string>(ESSENTIAL_CATEGORIES)
  const hormiga = month
    .filter(
      (t) =>
        !isInflow(t.type) &&
        Number(t.amount) <= HORMIGA_THRESHOLD &&
        !essential.has(t.ai_category ?? 'General')
    )
    .reduce((s, t) => s + Number(t.amount), 0)

  // Gastos recurrentes detectados
  const recurring = detectRecurring(transactions)
  const recurringTotal = recurring.reduce((s, r) => s + r.monthlyCost, 0)

  // Score financiero
  const score = computeScore({ accounts, cards, transactions, budgets })

  // Serie de patrimonio líquido reconstruida (últimos 90 días):
  // saldo líquido actual menos los efectos de las transacciones posteriores a cada día.
  const liquid = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const netEffect = (t: (typeof transactions)[number]) =>
    displayInflow(t) ? Number(t.amount) : -Number(t.amount)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const series: number[] = []
  for (let d = 89; d >= 0; d--) {
    const dd = new Date(today)
    dd.setDate(today.getDate() - d)
    const dayStr = dd.toISOString().slice(0, 10)
    const future = transactions
      .filter((t) => t.date > dayStr)
      .reduce((s, t) => s + netEffect(t), 0)
    series.push(liquid - future)
  }
  const chartStart = series[0] ?? liquid
  const chartChange = chartStart !== 0 ? (liquid - chartStart) / Math.abs(chartStart) : 0

  const monthName = new Date().toLocaleDateString('es-MX', { month: 'long' })

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader
        title="Dashboard"
        subtitle={`Resumen de ${monthName}`}
        action={
          <Link
            href="/proyecciones"
            className="inline-flex items-center gap-1 text-sm font-medium text-black hover:underline"
          >
            <TrendingUp className="w-4 h-4" /> Proyecciones
          </Link>
        }
      />

      {loading ? (
        <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      ) : (
        <>
          {/* Score + patrimonio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black text-white rounded-2xl p-4">
              <p className="text-xs text-gray-300">Score financiero</p>
              <p className="text-4xl font-bold mt-1 leading-none">{score.total}</p>
              <p className="text-xs text-gray-400 mt-1">{score.label}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
              <p className="text-xs text-gray-400">Liquidez</p>
              <p className="text-xl font-bold text-gray-900">{formatMXNCompact(liquid)}</p>
              <p className={`text-xs ${chartChange >= 0 ? 'text-gray-500' : 'text-red-500'}`}>
                {chartChange >= 0 ? '+' : ''}
                {(chartChange * 100).toFixed(0)}% · 90 días
              </p>
            </div>
          </div>

          {/* Desglose del score */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              ['Ahorro', score.savings],
              ['Colchón', score.runway],
              ['Crédito', score.utilization],
              ['Presup.', score.budget],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-white border border-gray-100 rounded-xl p-2 text-center shadow-sm">
                <p className="text-sm font-bold text-gray-900">{value as number}</p>
                <p className="text-[10px] text-gray-400">{label as string}</p>
              </div>
            ))}
          </div>

          {/* Gráfica de patrimonio */}
          <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mt-3 mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-900">Patrimonio en el tiempo</h2>
              <span className="text-xs text-gray-400">líquido · 90 días</span>
            </div>
            <LineChart data={series} />
          </section>

          {/* Resumen del mes */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Ingresos" value={income} />
            <StatCard label="Gastos" value={expense} />
            <StatCard label="Ahorro" value={savings} emphasis />
          </div>

          {income > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              Tasa de ahorro:{' '}
              <span className="font-semibold text-gray-900">
                {(savingsRate * 100).toFixed(0)}%
              </span>{' '}
              de tus ingresos este mes.
            </p>
          )}

          {/* Alerta gastos hormiga */}
          {hormiga > 0 && (
            <div className="mt-4 flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-black" />
              </div>
              <p className="text-sm text-gray-700">
                Gastos hormiga del mes:{' '}
                <span className="font-semibold text-black">{formatMXN(hormiga)}</span>.
                Pequeñas compras no esenciales que suman.
              </p>
            </div>
          )}

          {/* Presupuestos en riesgo */}
          {budgetAlerts.length > 0 && (
            <section className="mt-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Presupuestos en riesgo</h2>
                <Link href="/presupuestos" className="text-xs text-gray-400 hover:text-black">
                  Editar
                </Link>
              </div>
              <div className="space-y-2">
                {budgetAlerts.map((a) => {
                  const pct = a.spent / a.budget
                  return (
                    <div key={a.cat} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-gray-700 flex-1">{a.cat}</span>
                      <span className="text-red-500 font-medium">{(pct * 100).toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Compromisos detectados (gastos recurrentes) */}
          {recurring.length > 0 && (
            <section className="mt-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Compromisos detectados</h2>
                <span className="text-xs text-gray-400">≈ {formatMXN(recurringTotal)}/mes</span>
              </div>
              <div className="space-y-2">
                {recurring.slice(0, 6).map((r) => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-700 min-w-0">
                      <Repeat className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{r.label}</span>
                    </span>
                    <span className="text-gray-900 font-medium shrink-0">
                      {formatMXN(r.monthlyCost)}
                      <span className="text-gray-400 font-normal">/mes</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Barras por categoría */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Gastos por categoría</h2>
              <Link href="/presupuestos" className="text-xs text-gray-400 hover:text-black">
                Presupuestos
              </Link>
            </div>
            {categories.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-500">
                  Sin gastos este mes. Registra movimientos para ver el desglose.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                {categories.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat}</span>
                      <span className="font-medium text-gray-900">{formatMXN(amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full"
                        style={{ width: `${maxCat ? (amount / maxCat) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  emphasis,
}: {
  label: string
  value: number
  emphasis?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        emphasis ? 'bg-black text-white' : 'bg-white border border-gray-100 shadow-sm'
      }`}
    >
      <p className={`text-xs ${emphasis ? 'text-gray-300' : 'text-gray-400'}`}>{label}</p>
      <p className="text-base font-bold mt-1 leading-tight">{formatMXN(value)}</p>
    </div>
  )
}
