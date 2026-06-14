'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatPercent } from '@/lib/utils/format'
import { showToast } from '@/lib/toast'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import type { Account, Subaccount } from '@/types/finance'

const PRESETS = [
  { icon: '🏖️', name: 'Vacaciones' },
  { icon: '🛡️', name: 'Fondo de emergencia' },
  { icon: '🍽️', name: 'Comidas' },
  { icon: '🎓', name: 'Educación' },
  { icon: '🏠', name: 'Hogar' },
  { icon: '💊', name: 'Salud' },
  { icon: '🎁', name: 'Regalos' },
]

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'

export function SubaccountSection({
  account,
  subaccounts,
  onChange,
}: {
  account: Account
  subaccounts: Subaccount[]
  onChange: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  const sumSub = subaccounts.reduce((s, x) => s + Number(x.balance), 0)
  const free = Number(account.balance) - sumSub

  const removeSub = async (id: string) => {
    const { error } = await supabase.from('subaccounts').update({ is_active: false }).eq('id', id)
    if (!error) showToast('Apartado eliminado')
    onChange()
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Total {formatMXN(Number(account.balance))} · Libre {formatMXN(free)} · En apartados{' '}
        {formatMXN(sumSub)}
      </p>

      {subaccounts.length > 0 && (
        <div className="mt-3 space-y-2">
          {subaccounts.map((s) => {
            const pct = s.goal_amount
              ? Math.min(Number(s.balance) / Number(s.goal_amount), 1)
              : null
            return (
              <div key={s.id} className="bg-muted rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground min-w-0">
                    <span>{s.icon}</span>
                    <span className="truncate">{s.name}</span>
                    {s.yield_rate > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        · {formatPercent(s.yield_rate)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      {formatMXN(Number(s.balance))}
                    </span>
                    <button
                      onClick={() => removeSub(s.id)}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label="Eliminar apartado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                {pct !== null && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct * 100}%`, backgroundColor: s.color ?? '#6366F1' }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatMXN(Number(s.balance))} de {formatMXN(Number(s.goal_amount))} (
                      {(pct * 100).toFixed(0)}%)
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd ? (
        <AddSubaccountForm
          account={account}
          onDone={() => {
            setShowAdd(false)
            onChange()
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar apartado
        </button>
      )}
    </div>
  )
}

function AddSubaccountForm({
  account,
  onDone,
  onCancel,
}: {
  account: Account
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [balance, setBalance] = useState('')
  const [yieldRate, setYieldRate] = useState(
    account.yield_rate ? String((Number(account.yield_rate) * 100).toFixed(2)) : ''
  )
  const [goalAmount, setGoalAmount] = useState('')
  const [color, setColor] = useState('#6366F1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión no válida')
      setBusy(false)
      return
    }
    const { error } = await supabase.from('subaccounts').insert({
      user_id: user.id,
      account_id: account.id,
      name: name.trim(),
      icon,
      balance: parseFloat(balance) || 0,
      yield_rate: parseFloat(yieldRate) / 100 || 0,
      goal_amount: goalAmount ? parseFloat(goalAmount) : null,
      goal_name: name.trim(),
      color,
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    showToast('Apartado creado')
    onDone()
  }

  return (
    <div className="mt-3 bg-muted rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setIcon(p.icon)
              setName(p.name)
            }}
            className="px-2.5 py-1.5 rounded-full bg-card border border-border text-xs hover:border-foreground"
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className={`${inputClass} w-16 text-center`}
          aria-label="Ícono"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del apartado"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <CurrencyInput
          value={parseFloat(balance) || 0}
          onChange={(n) => setBalance(String(n))}
          placeholder="Saldo"
          className={inputClass}
        />
        <input
          type="number"
          value={yieldRate}
          onChange={(e) => setYieldRate(e.target.value)}
          placeholder="Rend. % anual"
          className={inputClass}
        />
      </div>

      <CurrencyInput
        value={parseFloat(goalAmount) || 0}
        onChange={(n) => setGoalAmount(String(n))}
        placeholder="Meta (opcional)"
        className={inputClass}
      />

      <div>
        <label className="block text-xs text-muted-foreground mb-2">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar apartado'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
