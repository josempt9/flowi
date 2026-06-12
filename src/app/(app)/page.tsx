'use client'

import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Clock, Settings, Sparkles } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useTransactions } from '@/hooks/useTransactions'
import { typeLabel } from '@/lib/constants'
import { formatMXN, formatMXNCompact, formatRelative } from '@/lib/utils/format'
import { bestYieldRate, computeCardFloat, daysUntilMonthDay } from '@/lib/utils/float'
import { displayInflow } from '@/lib/utils/transactions'
import { OnboardingWizard } from '@/components/home/OnboardingWizard'

export default function HomePage() {
  const { accounts, loading: la, refresh: refreshAccounts } = useAccounts()
  const { cards, loading: lc } = useCards()
  const { transactions, loading: lt, refresh: refreshTransactions } = useTransactions(8)

  // Usuario nuevo: ya cargó y no tiene ningún movimiento registrado.
  const isNewUser = !la && !lt && transactions.length === 0

  const liquid = accounts.reduce((sum, a) => sum + Number(a.balance), 0)
  const debt = cards.reduce((sum, c) => sum + Number(c.current_balance), 0)
  const net = liquid - debt

  const floatBenefit = cards.reduce(
    (sum, c) => sum + computeCardFloat(c, accounts).benefit,
    0
  )
  const yieldRate = bestYieldRate(accounts)

  const paymentReminders = cards.filter((c) => {
    const d = daysUntilMonthDay(c.payment_day)
    return d !== null && d <= 3 && Number(c.current_balance) > 0
  })

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
            {transactions.map((t) => {
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
        <div key={i} className="h-16 bg-white border border-gray-100 rounded-2xl animate-pulse" />
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
