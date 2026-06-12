'use client'

import { useState } from 'react'
import { Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { formatMXN, formatPercent } from '@/lib/utils/format'
import { computeCardFloat } from '@/lib/utils/float'
import { PageHeader } from '@/components/shared/PageHeader'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent'

export default function TarjetasPage() {
  const { cards, loading, error, refresh } = useCards()
  const { accounts } = useAccounts()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const supabase = createClient()

  const totalFloat = cards.reduce(
    (sum, c) => sum + computeCardFloat(c, accounts).benefit,
    0
  )

  const saveBalance = async (id: string) => {
    setBusy(true)
    setActionError('')
    const { error } = await supabase
      .from('credit_cards')
      .update({ current_balance: parseFloat(editValue) || 0 })
      .eq('id', id)
    if (error) setActionError(error.message)
    setEditingId(null)
    setBusy(false)
    refresh()
  }

  const deleteCard = async (id: string) => {
    setBusy(true)
    setActionError('')
    const { error } = await supabase.from('credit_cards').update({ is_active: false }).eq('id', id)
    if (error) setActionError(error.message)
    setConfirmingId(null)
    setBusy(false)
    refresh()
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader
        title="Tarjetas"
        subtitle={totalFloat > 0 ? `Float del periodo: ${formatMXN(totalFloat)}` : 'Tarjetas de crédito'}
        action={
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-black hover:underline"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        }
      />

      {(error || actionError) && (
        <p className="text-red-500 text-sm mb-4">{actionError || error}</p>
      )}

      {showAdd && <AddCardForm onDone={() => { setShowAdd(false); refresh() }} />}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500">No tienes tarjetas registradas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((c) => {
            const float = computeCardFloat(c, accounts)
            const utilPct = float.utilization * 100
            return (
              <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.institution}</p>
                  </div>
                  {confirmingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteCard(c.id)}
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
                      onClick={() => setConfirmingId(c.id)}
                      className="text-gray-300 hover:text-red-500"
                      aria-label="Eliminar tarjeta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Saldo / límite */}
                <div className="mt-4 flex items-end justify-between">
                  {editingId === c.id ? (
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
                        onClick={() => saveBalance(c.id)}
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
                      <div>
                        <p className="text-xs text-gray-400">Saldo utilizado</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatMXN(Number(c.current_balance))}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          de {formatMXN(Number(c.credit_limit))}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingId(c.id)
                          setEditValue(String(c.current_balance))
                        }}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-black"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </>
                  )}
                </div>

                {/* Utilización */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Utilización</span>
                    <span className={utilPct >= 80 ? 'text-red-500 font-medium' : ''}>
                      {utilPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${utilPct >= 80 ? 'bg-red-500' : 'bg-black'}`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>

                {/* Float + días */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Días para pago</p>
                    <p className="font-semibold text-gray-900">
                      {float.daysToPayment !== null ? `${float.daysToPayment} días` : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Float del periodo</p>
                    <p className="font-semibold text-gray-900">{formatMXN(float.benefit)}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {totalFloat > 0 && (
            <p className="text-xs text-gray-500 text-center px-4">
              El float es el rendimiento que tu dinero gana mientras financias estas
              compras hasta la fecha de pago, a {formatPercent(
                accounts.reduce((m, a) => Math.max(m, a.yield_rate ?? 0), 0)
              )}{' '}
              anual.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function AddCardForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [cutDay, setCutDay] = useState('')
  const [paymentDay, setPaymentDay] = useState('')
  const [graceDays, setGraceDays] = useState('')
  const [cat, setCat] = useState('')
  const [cashbackPct, setCashbackPct] = useState('')
  const [annualFee, setAnnualFee] = useState('')
  const [institution, setInstitution] = useState('')
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const searchConditions = async () => {
    if (!name.trim()) return
    setSearching(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/card-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudieron buscar las condiciones.')
        return
      }
      if (data.cut_day != null) setCutDay(String(data.cut_day))
      if (data.payment_day != null) setPaymentDay(String(data.payment_day))
      if (data.grace_days != null) setGraceDays(String(data.grace_days))
      if (data.cat != null) setCat(String(data.cat))
      if (data.cashback_rate != null) setCashbackPct(String((data.cashback_rate * 100).toFixed(2)))
      if (data.annual_fee != null) setAnnualFee(String(data.annual_fee))
      if (data.institution) setInstitution(String(data.institution))
      const conf = data.confidence ? `Confianza ${data.confidence}. ` : ''
      setInfo(`${conf}${data.note ?? 'Revisa y confirma los datos antes de guardar.'}`)
    } catch {
      setError('Error de red al buscar las condiciones.')
    } finally {
      setSearching(false)
    }
  }

  const submit = async () => {
    if (!name.trim() || !limit) return
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
    const { error } = await supabase.from('credit_cards').insert({
      user_id: user.id,
      name: name.trim(),
      credit_limit: parseFloat(limit) || 0,
      cut_day: cutDay ? parseInt(cutDay) : null,
      payment_day: paymentDay ? parseInt(paymentDay) : null,
      grace_days: graceDays ? parseInt(graceDays) : 20,
      cat: cat ? parseFloat(cat) : null,
      cashback_rate: cashbackPct ? parseFloat(cashbackPct) / 100 : 0,
      annual_fee: annualFee ? parseFloat(annualFee) : 0,
      institution: institution.trim() || null,
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
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (p. ej. BBVA Azul, Nu)"
          className={inputClass}
        />
        <button
          onClick={searchConditions}
          disabled={searching || !name.trim()}
          className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-black disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {searching ? '…' : 'Buscar'}
        </button>
      </div>

      {info && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{info}</p>
      )}

      <input
        type="number"
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
        placeholder="Límite de crédito"
        className={inputClass}
      />
      <div className="flex gap-3">
        <input
          type="number"
          min={1}
          max={31}
          value={cutDay}
          onChange={(e) => setCutDay(e.target.value)}
          placeholder="Día de corte"
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          max={31}
          value={paymentDay}
          onChange={(e) => setPaymentDay(e.target.value)}
          placeholder="Día de pago"
          className={inputClass}
        />
      </div>
      <div className="flex gap-3">
        <input
          type="number"
          value={graceDays}
          onChange={(e) => setGraceDays(e.target.value)}
          placeholder="Días de gracia"
          className={inputClass}
        />
        <input
          type="number"
          step="0.01"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          placeholder="CAT %"
          className={inputClass}
        />
      </div>
      <div className="flex gap-3">
        <input
          type="number"
          step="0.01"
          value={cashbackPct}
          onChange={(e) => setCashbackPct(e.target.value)}
          placeholder="Cashback %"
          className={inputClass}
        />
        <input
          type="number"
          value={annualFee}
          onChange={(e) => setAnnualFee(e.target.value)}
          placeholder="Anualidad MXN"
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
        disabled={busy || !name.trim() || !limit}
        className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar tarjeta'}
      </button>
    </div>
  )
}
