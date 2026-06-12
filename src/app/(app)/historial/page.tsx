'use client'

import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Download, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { CATEGORIES, TYPE_OPTIONS, typeLabel } from '@/lib/constants'
import { formatMXN, formatShortDate } from '@/lib/utils/format'
import { displayInflow } from '@/lib/utils/transactions'
import { reconcileEdit, reverseFromBalance } from '@/lib/services/balances'
import { deleteTransfer } from '@/lib/services/transfers'
import { exportTransactionsToXlsx } from '@/lib/services/export'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Account, Transaction, TransactionType } from '@/types/finance'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent'

export default function HistorialPage() {
  const { transactions, loading, refresh } = useTransactions()
  const { accounts } = useAccounts()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fAccount, setFAccount] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fType, setFType] = useState('all')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.name]))
    return (id: string | null) => (id ? map.get(id) ?? '—' : 'Sin cuenta')
  }, [accounts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (fAccount !== 'all' && t.account_id !== fAccount) return false
      if (fCategory !== 'all' && (t.ai_category ?? '') !== fCategory) return false
      if (fType !== 'all' && t.type !== fType) return false
      if (fFrom && t.date < fFrom) return false
      if (fTo && t.date > fTo) return false
      if (q) {
        const hay = `${t.description ?? ''} ${t.ai_category ?? ''} ${t.raw_input ?? ''} ${t.notes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [transactions, search, fAccount, fCategory, fType, fFrom, fTo])

  const total = filtered.reduce(
    (s, t) => s + (displayInflow(t) ? Number(t.amount) : -Number(t.amount)),
    0
  )

  const activeFilters =
    (fAccount !== 'all' ? 1 : 0) +
    (fCategory !== 'all' ? 1 : 0) +
    (fType !== 'all' ? 1 : 0) +
    (fFrom ? 1 : 0) +
    (fTo ? 1 : 0)

  const clearFilters = () => {
    setFAccount('all')
    setFCategory('all')
    setFType('all')
    setFFrom('')
    setFTo('')
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader
        title="Historial"
        subtitle={`${filtered.length} movimiento${filtered.length === 1 ? '' : 's'} · Neto ${formatMXN(total)}`}
        action={
          <button
            onClick={() => {
              const range = fFrom || fTo ? `_${fFrom || 'inicio'}_${fTo || 'hoy'}` : ''
              exportTransactionsToXlsx(filtered, accountName, `flowi-movimientos${range}.xlsx`)
            }}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-black disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        }
      />

      {/* Buscador */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar movimientos…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative px-3 rounded-xl border text-sm shrink-0 ${
            activeFilters ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600'
          }`}
          aria-label="Filtros"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-bold w-4 h-4 rounded-full border border-black flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4 space-y-3">
          <select value={fAccount} onChange={(e) => setFAccount(e.target.value)} className={inputClass}>
            <option value="all">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className={inputClass}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={fType} onChange={(e) => setFType(e.target.value)} className={inputClass}>
            <option value="all">Todos los tipos</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Desde</label>
              <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Hasta</label>
              <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={inputClass} />
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-black">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500">
            {transactions.length === 0
              ? 'Aún no tienes movimientos.'
              : 'Ningún movimiento coincide con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
          {filtered.map((t) => {
            const inflow = displayInflow(t)
            return (
              <button
                key={t.id}
                onClick={() => setEditing(t)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
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
                  <p className="text-xs text-gray-400 truncate">
                    {typeLabel(t.type)} · {accountName(t.account_id)} · {formatShortDate(t.date)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  {inflow ? '+' : '−'}
                  {formatMXN(Number(t.amount))}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {editing && (
        <EditModal
          tx={editing}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function EditModal({
  tx,
  accounts,
  onClose,
  onSaved,
}: {
  tx: Transaction
  accounts: Account[]
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<TransactionType>(tx.type)
  const [amount, setAmount] = useState(String(tx.amount))
  const [accountId, setAccountId] = useState<string>(tx.account_id ?? '')
  const [category, setCategory] = useState(tx.ai_category ?? 'General')
  const [date, setDate] = useState(tx.date)
  const [description, setDescription] = useState(tx.description ?? '')
  const [notes, setNotes] = useState(tx.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()
  const isTransfer = tx.type === 'transfer'

  const save = async () => {
    setBusy(true)
    setError('')
    const newAmount = parseFloat(amount) || 0
    const newAccountId = accountId || null

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        type,
        amount: newAmount,
        account_id: newAccountId,
        ai_category: category,
        date,
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      .eq('id', tx.id)

    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }

    await reconcileEdit(
      supabase,
      { account_id: tx.account_id, type: tx.type, amount: Number(tx.amount) },
      { account_id: newAccountId, type, amount: newAmount }
    )
    onSaved()
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    if (isTransfer && tx.transfer_pair_id) {
      const { error: tErr } = await deleteTransfer(supabase, tx.transfer_pair_id)
      if (tErr) {
        setError(tErr)
        setBusy(false)
        return
      }
      onSaved()
      return
    }
    const { error: delError } = await supabase.from('transactions').delete().eq('id', tx.id)
    if (delError) {
      setError(delError.message)
      setBusy(false)
      return
    }
    await reverseFromBalance(supabase, tx.account_id, tx.type, Number(tx.amount))
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Editar movimiento</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isTransfer && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-600">
            Esta es una transferencia entre cuentas. Para cambiarla, elimínala y
            crea una nueva desde la pantalla de Cuentas.
          </div>
        )}

        <fieldset disabled={isTransfer} className="space-y-3 disabled:opacity-60">
          <Field label="Descripción">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex gap-3">
            <Field label="Tipo" className="flex-1">
              <select value={type} onChange={(e) => setType(e.target.value as TransactionType)} className={inputClass}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monto" className="flex-1">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Cuenta">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
              <option value="">Sin cuenta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-3">
            <Field label="Categoría" className="flex-1">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha" className="flex-1">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </fieldset>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        {!isTransfer && (
          <button
            onClick={save}
            disabled={busy}
            className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 mt-5"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}

        {confirmingDelete ? (
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-sm text-gray-600">¿Eliminar este movimiento?</span>
            <button onClick={remove} disabled={busy} className="text-sm font-medium text-red-500 hover:underline">
              Sí, eliminar
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-sm text-gray-400 hover:text-black">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-full flex items-center justify-center gap-2 text-red-500 py-3 rounded-xl text-sm font-medium hover:bg-red-50 mt-1"
          >
            <Trash2 className="w-4 h-4" /> Eliminar movimiento
          </button>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
