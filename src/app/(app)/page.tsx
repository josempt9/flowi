'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Settings, Sparkles } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useSubaccounts } from '@/hooks/useSubaccounts'
import { useRecurring } from '@/hooks/useRecurring'
import { typeLabel } from '@/lib/constants'
import { formatMXN, formatMXNCompact, formatRelative } from '@/lib/utils/format'
import { bestYieldRate, computeCardFloat, daysUntilMonthDay } from '@/lib/utils/float'
import { displayInflow } from '@/lib/utils/transactions'
import { nextOccurrenceDate, daysUntilDate } from '@/lib/utils/recurringItems'
import { OnboardingWizard } from '@/components/home/OnboardingWizard'
import { WeeklySummaryBanner } from '@/components/home/WeeklySummaryBanner'
import type { RecurringItem } from '@/types/finance'

export default function HomePage() {
  const { accounts, loading: la, refresh: refreshAccounts } = useAccounts()
  const { cards, loading: lc } = useCards()
  const { transactions, loading: lt, refresh: refreshTransactions } = useTransactions(50)
  const { budgets } = useBudgets()
  const { subaccounts } = useSubaccounts()
  const { items: recurringItems } = useRecurring()

  // Usuario nuevo: ya cargó y no tiene ningún movimiento registrado.
  const isNewUser = !la && !lt && transactions.length === 0

  const recent = transactions.slice(0, 8)

  const liquid = accounts.reduce((sum, a) => sum + Number(a.balance), 0)
  const debt = cards.reduce((sum, c) => sum + Number(c.current_balance), 0)
  const net = liquid - debt

  const floatBenefit = cards.reduce(
    (sum, c) => sum + computeCardFloat(c, accounts, subaccounts).benefit,
    0
  )
  const yieldRate = bestYieldRate(accounts, subaccounts)

  const paymentReminders = cards.filter((c) => {
    const d = daysUntilMonthDay(c.payment_day)
    return d !== null && d <= 3 && Number(c.current_balance) > 0
  })

  // Alerta in-app: categorías que alcanzan el 80% del presupuesto este mes.
  const now = new Date()
  const monthSpend = new Map<string, number>()
  for (const t of transactions) {
    const d = new Date(t.date)
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue
    if (t.type === 'transfer' || displayInflow(t)) continue
    const cat = t.ai_category || 'General'
    monthSpend.set(cat, (monthSpend.get(cat) ?? 0) + Number(t.amount))
  }
  const budgetAlerts = budgets
    .filter((b) => Number(b.amount) > 0)
    .map((b) => ({ cat: b.category, pct: (monthSpend.get(b.category) ?? 0) / Number(b.amount) }))
    .filter((x) => x.pct >= 0.8)
    .sort((a, b) => b.pct - a.pct)

  // Próximos compromisos recurrentes (siguientes 7 días)
  const upcoming = recurringItems
    .map((i) => ({ item: i, date: nextOccurrenceDate(i) }))
    .filter((x): x is { item: RecurringItem; date: Date } => x.date !== null && daysUntilDate(x.date) <= 7)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-bold text-gray-900">Flowi</span>
        <Link href="/ajustes" aria-label="Ajustes" className="text-gray-400 hover:text-black">
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      {isNewUser ? (
        <OnboardingWizard
          accounts={accounts}
          onChange={() => {
            refreshAccounts()
            refreshTransactions()
          }}
        />
      ) : (
      <>
      <WeeklySummaryBanner transactions={transactions} cards={cards} accounts={accounts} />
      {/* Patrimonio */}
      <section className="bg-black text-white rounded-3xl p-6">
        <p className="text-sm text-gray-300">Patrimonio neto</p>
        {la || lc ? (
          <div className="h-9 w-40 bg-white/10 rounded-lg animate-pulse mt-1" />
        ) : (
          <p className="text-4xl font-bold mt-1">{formatMXNCompact(net)}</p>
        )}
        <div className="flex gap-6 mt-5 text-sm">
          <div>
            <p className="text-gray-400">Líquido</p>
            <p className="font-medium">{formatMXNCompact(liquid)}</p>
          </div>
          <div>
            <p className="text-gray-400">Deuda tarjetas</p>
            <p className="font-medium">{formatMXNCompact(debt)}</p>
          </div>
        </div>
      </section>

      {/* Float insight */}
      {floatBenefit > 0 && (
        <Link
          href="/tarjetas"
          className="mt-4 flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
        >
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <p className="text-sm text-gray-700">
            Tu float está generando{' '}
            <span className="font-semibold text-black">
              {formatMXN(floatBenefit)}
            </span>{' '}
            este periodo a una tasa de {(yieldRate * 100).toFixed(0)}%.
          </p>
        </Link>
      )}

      {/* Recordatorios de pago de tarjetas */}
      {paymentReminders.map((c) => {
        const d = daysUntilMonthDay(c.payment_day)
        return (
          <Link
            key={c.id}
            href="/tarjetas"
            className="mt-3 flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
          >
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-black" />
            </div>
            <p className="text-sm text-gray-700">
              Pago de <span className="font-semibold text-black">{c.name}</span>{' '}
              {d === 0 ? 'es hoy' : `en ${d} día${d === 1 ? '' : 's'}`} ·{' '}
              {formatMXN(Number(c.current_balance))}
            </p>
          </Link>
        )
      })}

      {/* Alerta in-app: presupuesto al 80% */}
      {budgetAlerts.map((a) => (
        <Link
          key={a.cat}
          href="/presupuestos"
          className="mt-3 flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
        >
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-black" />
          </div>
          <p className="text-sm text-gray-700">
            {a.pct >= 1 ? 'Superaste' : 'Vas al'}{' '}
            <span className="font-semibold text-black">{(a.pct * 100).toFixed(0)}%</span>{' '}
            de tu presupuesto de <span className="font-semibold text-black">{a.cat}</span>.
          </p>
        </Link>
      ))}

      {/* Próximos compromisos (recurrentes a 7 días) */}
      {upcoming.length > 0 && (
        <Link
          href="/recurrentes"
          className="mt-3 block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
        >
          <p className="text-sm font-semibold text-gray-900 mb-1">Próximos compromisos</p>
          <div className="space-y-1">
            {upcoming.slice(0, 4).map(({ item, date }) => {
              const d = daysUntilDate(date)
              return (
                <p key={item.id} className="text-sm text-gray-600">
                  {d === 0 ? 'Hoy' : `En ${d} día${d === 1 ? '' : 's'}`}:{' '}
                  <span className="font-medium text-gray-900">{item.name}</span>{' '}
                  {item.type === 'income' ? '+' : ''}
                  {formatMXN(Number(item.amount))}
                </p>
              )
            })}
          </div>
        </Link>
      )}

      {/* Cuentas */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Mis cuentas</h2>
          <Link href="/cuentas" className="text-xs text-gray-400 hover:text-black">
            Ver todas
          </Link>
        </div>
        {la ? (
          <SkeletonRows />
        ) : accounts.length === 0 ? (
          <EmptyHint
            text="Aún no tienes cuentas."
            cta="Configurar cuentas"
            href="/cuentas"
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="shrink-0 w-40 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: a.color ?? '#000' }}
                  />
                  <span className="text-xs text-gray-500 truncate">{a.name}</span>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {formatMXN(Number(a.balance))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Movimientos */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Últimos movimientos
          </h2>
          <Link href="/historial" className="text-xs text-gray-400 hover:text-black">
            Ver historial
          </Link>
        </div>
        {lt ? (
          <SkeletonRows />
        ) : transactions.length === 0 ? (
          <EmptyHint
            text="Todavía no registras movimientos."
            cta="Registrar el primero"
            href="/registro"
          />
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
            {recent.map((t) => {
              const inflow = displayInflow(t)
              return (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    {inflow ? (
                      <ArrowDownLeft className="w-4 h-4 text-black" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-black" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {t.description || t.ai_category || typeLabel(t.type)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {typeLabel(t.type)} · {formatRelative(t.created_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {inflow ? '+' : '−'}
                    {formatMXN(Number(t.amount))}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
      </>
      )}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

function EmptyHint({ text, cta, href }: { text: string; cta: string; href: string }) {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-500">{text}</p>
      <Link
        href={href}
        className="inline-block mt-3 text-sm font-medium text-black hover:underline"
      >
        {cta}
      </Link>
    </div>
  )
}
