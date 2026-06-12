'use client'

import { useState } from 'react'
import { ArrowLeftRight, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import {
  ACCOUNT_TYPE_OPTIONS,
  INITIAL_ACCOUNTS,
  INITIAL_CARDS,
  accountTypeLabel,
} from '@/lib/constants'
import { formatMXN, formatPercent } from '@/lib/utils/format'
import { createTransfer } from '@/lib/services/transfers'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Account, AccountType } from '@/types/finance'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400'

export default function CuentasPage() {
  const { accounts, loading, error, refresh } = useAccounts()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const supabase = createClient()
  const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  const saveBalance = async (id: string) => {
    setBusy(true)
    setActionError('')
    const { error } = await supabase
      .from('accounts')
      .update({ balance: parseFloat(editValue) || 0, last_updated: new Date().toISOString() })
      .eq('id', id)
    if (error) setActionError(error.message)
    setEditingId(null)
    setBusy(false)
    refresh()
  }

  const deleteAccount = async (id: string) => {
    setBusy(true)
    setActionError('')
    const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id)
    if (error) setActionError(error.message)
    setConfirmingId(null)
    setBusy(false)
    refresh()
  }

  const seedInitial = async () => {
    setBusy(true)
    setActionError('')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setActionError('Sesión no válida')
      setBusy(false)
      return
    }
    const { error: accErr } = await supabase.from('accounts').insert(
      INITIAL_ACCOUNTS.map((a) => ({ ...a, user_id: user.id, balance: 0 }))
    )
    await supabase.from('credit_cards').insert(
      INITIAL_CARDS.map((c) => ({ ...c, user_id: user.id }))
    )
    if (accErr) setActionError(accErr.message)
    setBusy(false)
    refresh()
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader
        title="Cuentas"
        subtitle={`Saldo total: ${formatMXN(total)}`}
        action={
          <div className="flex items-center gap-3">
            {accounts.length >= 2 && (
              <button
                onClick={() => setShowTransfer(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-black"
              >
                <ArrowLeftRight className="w-4 h-4" /> Transferir
              </button>
            )}
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-black hover:underline"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        }
      />

      {(error || actionError) && (
        <p className="text-red-500 text-sm mb-4">{actionError || error}</p>
      )}

      {showAdd && <AddAccountForm onDone={() => { setShowAdd(false); refresh() }} />}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500">
            No tienes cuentas todavía. Crea las cuentas y tarjetas iniciales para empezar.
          </p>
          <button
            onClick={seedInitial}
            disabled={busy}
            className="mt-4 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Creando…' : 'Crear cuentas iniciales'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: a.color ?? '#000' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">
                      {accountTypeLabel(a.type)}
                      {a.yield_rate ? ` · ${formatPercent(a.yield_rate)} anual` : ''}
                    </p>
                  </div>
                </div>

                {confirmingId === a.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => deleteAccount(a.id)}
                      disabled={busy}
                      className="text-xs font-medium text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-xs text-gray-400 hover:text-black"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(a.id)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    aria-label="Eliminar cuenta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-end justify-between">
                {editingId === a.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      onClick={() => saveBalance(a.id)}
                      disabled={busy}
                      className="p-2.5 rounded-xl bg-black text-white shrink-0"
                      aria-label="Guardar saldo"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2.5 rounded-xl border border-gray-200 shrink-0"
                      aria-label="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold text-gray-900">
                      {formatMXN(Number(a.balance))}
                    </p>
                    <button
                      onClick={() => {
                        setEditingId(a.id)
                        setEditValue(String(a.balance))
                      }}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-black"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Actualizar saldo
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showTransfer && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowTransfer(false)}
          onDone={() => {
            setShowTransfer(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function TransferModal({
  accounts,
  onClose,
  onDone,
}: {
  accounts: Account[]
  onClose: () => void
  onDone: () => void
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '')
  const [toId, setToId] = useState(accounts[1]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const submit = async () => {
    const value = parseFloat(amount) || 0
    if (fromId === toId) {
      setError('Elige dos cuentas distintas.')
      return
    }
    if (value <= 0) {
      setError('El monto debe ser mayor a cero.')
      return
    }
    const from = accounts.find((a) => a.id === fromId)
    const to = accounts.find((a) => a.id === toId)
    if (!from || !to) return

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
    const { error } = await createTransfer(supabase, {
      userId: user.id,
      from,
      to,
      amount: value,
      date,
      notes,
    })
    if (error) {
      setError(error)
      setBusy(false)
      return
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Transferencia entre cuentas</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desde</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {formatMXN(Number(a.balance))}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center text-gray-300">
            <ArrowLeftRight className="w-4 h-4 rotate-90" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hacia</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputClass}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {formatMXN(Number(a.balance))}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notas (opcional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 mt-5"
        >
          {busy ? 'Transfiriendo…' : 'Confirmar transferencia'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Mueve el saldo entre cuentas. No cuenta como ingreso ni gasto.
        </p>
      </div>
    </div>
  )
}

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('debit')
  const [balance, setBalance] = useState('')
  const [yieldRate, setYieldRate] = useState('')
  const [institution, setInstitution] = useState('')
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
    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: name.trim(),
      type,
      balance: parseFloat(balance) || 0,
      yield_rate: parseFloat(yieldRate) / 100 || 0,
      institution: institution.trim() || null,
      color: '#000000',
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    onDone()
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre (p. ej. Nu, BBVA)"
        className={inputClass}
      />
      <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={inputClass}>
        {ACCOUNT_TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <div className="flex gap-3">
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Saldo inicial"
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
      <input
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
        placeholder="Institución (opcional)"
        className={inputClass}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar cuenta'}
      </button>
    </div>
  )
}
