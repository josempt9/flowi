'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/format'
import type { Account } from '@/types/finance'

/**
 * Wizard de onboarding para usuario nuevo (0 movimientos). Guía 3 pasos:
 * 1) configurar cuentas, 2) actualizar saldo, 3) registrar primer movimiento.
 * Cada paso se marca como completo según el estado real de los datos.
 */
export function OnboardingWizard({
  accounts,
  onChange,
}: {
  accounts: Account[]
  onChange: () => void
}) {
  const hasAccounts = accounts.length > 0
  const hasBalance = accounts.some((a) => Number(a.balance) !== 0)

  const steps = [
    {
      title: 'Agrega tu primera cuenta',
      desc: 'Mercado Pago, débito, efectivo… donde tienes tu dinero.',
      done: hasAccounts,
    },
    {
      title: 'Actualiza tu saldo',
      desc: 'Pon cuánto tienes hoy en cada cuenta.',
      done: hasBalance,
    },
    {
      title: 'Registra tu primer movimiento',
      desc: 'Escribe o dicta un gasto y deja que la IA lo interprete.',
      done: false,
    },
  ]

  const current = steps.findIndex((s) => !s.done)

  return (
    <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mt-2">
      <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Flowi</h1>
      <p className="text-gray-500 text-sm mt-1">
        Configura tu tesorería personal en 3 pasos.
      </p>

      <div className="mt-6 space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`rounded-2xl border p-4 transition-colors ${
              i === current ? 'border-black' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                  step.done
                    ? 'bg-black text-white'
                    : i === current
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step.done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>

                {i === current && (
                  <div className="mt-3">
                    {i === 0 && (
                      <Link
                        href="/cuentas"
                        className="inline-block bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"
                      >
                        Configurar cuentas
                      </Link>
                    )}
                    {i === 1 && (
                      <QuickBalance accounts={accounts} onSaved={onChange} />
                    )}
                    {i === 2 && (
                      <Link
                        href="/registro"
                        className="inline-block bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"
                      >
                        Registrar movimiento
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickBalance({
  accounts,
  onSaved,
}: {
  accounts: Account[]
  onSaved: () => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [balance, setBalance] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400'

  const save = async () => {
    if (!accountId) return
    setBusy(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .update({ balance: parseFloat(balance) || 0, last_updated: new Date().toISOString() })
      .eq('id', accountId)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setBusy(false)
    onSaved()
  }

  return (
    <div className="space-y-2">
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className={inputClass}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {formatMXN(Number(a.balance))}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Wallet className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="Saldo actual"
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          onClick={save}
          disabled={busy || balance === ''}
          className="shrink-0 bg-black text-white px-5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? '…' : 'Guardar'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
