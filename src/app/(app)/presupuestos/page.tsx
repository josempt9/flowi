'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { CATEGORIES } from '@/lib/constants'
import { formatMXN } from '@/lib/utils/format'
import { isInflow } from '@/lib/utils/transactions'
import { PageHeader } from '@/components/shared/PageHeader'

const inputClass =
  'w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent'

function inCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export default function PresupuestosPage() {
  const { budgets, loading: lb, refresh } = useBudgets()
  const { transactions, loading: lt } = useTransactions()
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const map: Record<string, string> = {}
    for (const b of budgets) map[b.category] = String(b.amount)
    setAmounts(map)
  }, [budgets])

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!inCurrentMonth(t.date) || t.type === 'transfer' || isInflow(t.type)) continue
      const cat = t.ai_category || 'General'
      map.set(cat, (map.get(cat) ?? 0) + Number(t.amount))
    }
    return map
  }, [transactions])

  const saveAll = async () => {
    setBusy(true)
    setError('')
    setSaved(false)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión no válida')
      setBusy(false)
      return
    }
    const rows = CATEGORIES.map((cat) => ({
      user_id: user.id,
      category: cat,
      amount: parseFloat(amounts[cat] ?? '0') || 0,
    }))
    const { error } = await supabase.from('budgets').upsert(rows, {
      onConflict: 'user_id,category',
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setBusy(false)
    setSaved(true)
    refresh()
  }

  const monthName = new Date().toLocaleDateString('es-MX', { month: 'long' })

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader title="Presupuestos" subtitle={`Mensual por categoría · ${monthName}`} />

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {!lb && budgets.length === 0 && (
        <p className="text-sm text-gray-500 bg-gray-50 dark:bg-zinc-900 border border-gray-100 rounded-2xl p-4 mb-4">
          Define cuánto quieres gastar por categoría. Te avisaremos al llegar al 80%.
        </p>
      )}

      {lb || lt ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const budget = parseFloat(amounts[cat] ?? '0') || 0
            const spent = spentByCategory.get(cat) ?? 0
            const pct = budget > 0 ? spent / budget : 0
            const alert = budget > 0 && pct >= 0.8
            const over = pct > 1
            return (
              <div key={cat} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-900">{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      step="1"
                      value={amounts[cat] ?? ''}
                      onChange={(e) => setAmounts((a) => ({ ...a, [cat]: e.target.value }))}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>

                {budget > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={alert ? 'text-red-500 font-medium' : 'text-gray-400'}>
                        {formatMXN(spent)} de {formatMXN(budget)}
                      </span>
                      <span className={alert ? 'text-red-500 font-medium' : 'text-gray-500'}>
                        {(pct * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${alert ? 'bg-red-500' : 'bg-black'}`}
                        style={{ width: `${Math.min(pct * 100, 100)}%` }}
                      />
                    </div>
                    {alert && (
                      <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {over
                          ? `Excediste el presupuesto por ${formatMXN(spent - budget)}`
                          : 'Llegaste al 80% de tu presupuesto'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={saveAll}
        disabled={busy || lb}
        className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 mt-5"
      >
        {busy ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar presupuestos'}
      </button>
    </div>
  )
}
