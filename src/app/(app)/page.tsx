'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Check, Settings, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useSubaccounts } from '@/hooks/useSubaccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { useRecurring } from '@/hooks/useRecurring'
import { typeLabel } from '@/lib/constants'
import {
  formatMXN,
  formatMXNCompact,
  formatRelative,
  formatShortDate,
  formatToday,
} from '@/lib/utils/format'
import {
  bestYieldRate,
  computeCardFloat,
  daysUntilMonthDay,
  nextMonthDayDate,
} from '@/lib/utils/float'
import { displayInflow } from '@/lib/utils/transactions'
import {
  calculateCPCoverage,
  getPaymentUrgency,
  groupCardsByUrgency,
} from '@/lib/utils/treasury'
import { computeScore } from '@/lib/utils/score'
import { nextOccurrenceDate, daysUntilDate } from '@/lib/utils/recurringItems'
import { showToast } from '@/lib/toast'
import { OnboardingWizard } from '@/components/home/OnboardingWizard'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { SkeletonList } from '@/components/shared/Skeleton'
import type { Account, CreditCard, RecurringItem } from '@/types/finance'

export default function HomePage() {
  const { accounts, loading: la, refresh: refreshAccounts } = useAccounts()
  const { cards, loading: lc } = useCards()
  const { subaccounts } = useSubaccounts()
  const { transactions, loading: lt, refresh: refreshTransactions } = useTransactions(50)
  const { budgets } = useBudgets()
  const { items: recurringItems } = useRecurring()
  const [name, setName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { name?: string } | undefined
      setName(meta?.name || data.user?.email?.split('@')[0] || '')
    })
  }, [])

  const isNewUser = !la && !lt && transactions.length === 0
  const refreshAll = () => {
    refreshAccounts()
    refreshTransactions()
  }

  // Tesorería
  const coverage = calculateCPCoverage(accounts, subaccounts, cards)
  const score = computeScore({ accounts, cards, transactions, budgets })
  const filled = Math.max(0, Math.min(5, Math.round(score.total / 20)))
  const dots = '●'.repeat(filled) + '○'.repeat(5 - filled)

  // Semáforo de pagos
  const grouped = groupCardsByUrgency(cards)
  const orderedDebt = [...grouped.critical, ...grouped.warning, ...grouped.safe]

  // Float
  const floatTotal = cards.reduce(
    (s, c) => s + computeCardFloat(c, accounts, subaccounts).benefit,
    0
  )
  const yieldRate = bestYieldRate(accounts, subaccounts)
  const bestAccount = [...accounts].sort((a, b) => (b.yield_rate ?? 0) - (a.yield_rate ?? 0))[0]
  const maxDays = cards.reduce((m, c) => {
    const d = daysUntilMonthDay(c.payment_day)
    return d !== null && d > m ? d : m
  }, 0)

  // Recurrentes próximos 3 días
  const upcoming = recurringItems
    .map((i) => ({ item: i, date: nextOccurrenceDate(i) }))
    .filter((x): x is { item: RecurringItem; date: Date } => x.date !== null && daysUntilDate(x.date) <= 3)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const recent = transactions.slice(0, 5)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const apartadosLine = subaccounts
    .map((s) => `${s.name} ${formatMXNCompact(Number(s.balance))}`)
    .join(' · ')

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      {/* Bloque 1 — Encabezado */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-lg font-bold text-gray-900">
            {greeting}
            {name ? `, ${name}` : ''}
          </p>
          <p className="text-xs text-gray-400">{formatToday()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Score</p>
            <p className="text-sm font-bold text-gray-900">
              {score.total} <span className="text-gray-400">{dots}</span>
            </p>
          </div>
          <Link href="/ajustes" aria-label="Ajustes" className="text-gray-400 hover:text-black">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {la || lt ? (
        <SkeletonList rows={4} />
      ) : isNewUser ? (
        <OnboardingWizard accounts={accounts} onChange={refreshAll} />
      ) : (
        <div className="space-y-5">
          {/* Bloque 2 — Tesorería */}
          <section
            className={`rounded-3xl p-5 border ${
              coverage.canCoverCP
                ? 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-900'
                : 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900'
            }`}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cobertura CP</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {formatMXNCompact(coverage.liquidBalance)}
                  <span className="text-xs font-normal text-gray-500">
                    {' '}/ {formatMXNCompact(coverage.cpDebt)}
                  </span>
                </p>
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${coverage.canCoverCP ? 'bg-green-600' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(coverage.coverageRatio * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] font-medium mt-1.5 text-gray-700">
                  {coverage.cpDebt === 0
                    ? 'Sin deuda del ciclo'
                    : coverage.canCoverCP
                      ? '✓ Cubre deuda CP'
                      : `⚠️ Déficit ${formatMXNCompact(coverage.cpDebt - coverage.liquidBalance)}`}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Caja libre</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">
                  {formatMXNCompact(coverage.freeCash)}
                </p>
                <p className="text-[11px] text-gray-500">después de compromisos</p>
                <Link
                  href="/cuentas"
                  className="inline-block mt-2 text-xs font-medium text-black underline"
                >
                  Actualizar
                </Link>
              </div>
            </div>
          </section>

          {/* Bloque 3 — Mis cuentas */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900">Mis cuentas</h2>
              <Link href="/cuentas" className="text-xs text-gray-400 hover:text-black">
                Ver todas
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1">
              {accounts.map((a) => (
                <AccountChip
                  key={a.id}
                  account={a}
                  reserved={subaccounts
                    .filter((s) => s.account_id === a.id)
                    .reduce((s, x) => s + Number(x.balance), 0)}
                  onSaved={refreshAll}
                />
              ))}
            </div>
            {apartadosLine && (
              <p className="text-[11px] text-gray-400 mt-2">Apartados: {apartadosLine}</p>
            )}
          </section>

          {/* Bloque 4 — Por pagar (semáforo) */}
          {orderedDebt.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Por pagar</h2>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
                {orderedDebt.map((c) => (
                  <PayRow key={c.id} card={c} />
                ))}
              </div>
            </section>
          )}

          {/* Bloque 5 — Float activo */}
          {floatTotal > 0 && (
            <Link
              href="/tarjetas"
              className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Float activo:{' '}
                  <span className="font-semibold text-black">{formatMXN(floatTotal)}</span> este ciclo
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {bestAccount?.name ?? 'Tu cuenta'} {(yieldRate * 100).toFixed(0)}% × {maxDays} días ×{' '}
                  {formatMXNCompact(coverage.cpDebt)}
                </p>
              </div>
            </Link>
          )}

          {/* Bloque 6 — Últimos movimientos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900">Últimos movimientos</h2>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400">Sin movimientos aún.</p>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
                {recent.map((t) => {
                  const inflow = displayInflow(t)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        {inflow ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-black" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {t.description || t.ai_category || typeLabel(t.type)}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatRelative(t.created_at)}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 shrink-0">
                        {inflow ? '+' : '−'}
                        {formatMXN(Number(t.amount))}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
            <Link
              href="/historial"
              className="block text-center text-xs text-gray-400 hover:text-black mt-2"
            >
              Ver historial completo
            </Link>
          </section>

          {/* Bloque 7 — Próximos recurrentes (3 días) */}
          {upcoming.length > 0 && (
            <Link
              href="/recurrentes"
              className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            >
              <p className="text-sm text-gray-700">
                📅{' '}
                {upcoming.slice(0, 3).map(({ item, date }, idx) => {
                  const d = daysUntilDate(date)
                  const when = d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`
                  return (
                    <span key={item.id}>
                      {idx > 0 ? ' · ' : ''}
                      {when}: <span className="font-medium text-gray-900">{item.name}</span>{' '}
                      {item.type === 'income' ? '+' : ''}
                      {formatMXNCompact(Number(item.amount))}
                    </span>
                  )
                })}
              </p>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function AccountChip({
  account,
  reserved,
  onSaved,
}: {
  account: Account
  reserved: number
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(Number(account.balance))
  const [busy, setBusy] = useState(false)
  const free = Number(account.balance) - reserved

  const save = async () => {
    setBusy(true)
    const supabase = createClient()
    await supabase
      .from('accounts')
      .update({ balance: value, last_updated: new Date().toISOString() })
      .eq('id', account.id)
    setBusy(false)
    setEditing(false)
    showToast('Saldo actualizado')
    onSaved()
  }

  if (editing) {
    return (
      <div className="shrink-0 w-48 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
        <p className="text-xs text-gray-500 truncate mb-1">{account.name}</p>
        <div className="flex items-center gap-1">
          <CurrencyInput
            value={value}
            onChange={setValue}
            autoFocus
            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
          />
          <button
            onClick={save}
            disabled={busy}
            className="p-1.5 rounded-lg bg-black text-white shrink-0 disabled:opacity-50"
            aria-label="Guardar saldo"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setValue(Number(account.balance))
        setEditing(true)
      }}
      className="shrink-0 w-36 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-left"
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: account.color ?? '#64748B' }}
        />
        <span className="text-xs text-gray-500 truncate">{account.name}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 mt-2">{formatMXN(free)}</p>
      {reserved > 0 && (
        <p className="text-[10px] text-gray-400">{formatMXNCompact(reserved)} en apartados</p>
      )}
    </button>
  )
}

function PayRow({ card }: { card: CreditCard }) {
  const urgency = getPaymentUrgency(card)
  const dotColor =
    urgency === 'critical'
      ? 'bg-red-500'
      : urgency === 'warning'
        ? 'bg-yellow-500'
        : 'bg-green-500'
  const days = daysUntilMonthDay(card.payment_day)
  const payDate = nextMonthDayDate(card.payment_day)
  const available = Number(card.credit_limit) - Number(card.current_balance)

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{card.name}</p>
          <p className="text-[11px] text-gray-400">
            {payDate ? `Pagar: ${formatShortDate(payDate)}` : 'Sin fecha'}
            {days !== null ? ` · ${days} días` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatMXN(Number(card.current_balance))}</p>
          {available > 0 && (
            <p className="text-[10px] text-gray-400">{formatMXNCompact(available)} disp.</p>
          )}
        </div>
      </div>
      {Number(card.previous_balance) > 0 && (
        <div className="flex items-center justify-between pl-[22px] mt-1 text-[11px] text-gray-400">
          <span>2do corte (ciclo anterior)</span>
          <span>{formatMXN(Number(card.previous_balance))}</span>
        </div>
      )}
    </div>
  )
}
