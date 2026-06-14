'use client'

import { useState } from 'react'
import { Check, CreditCard, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { formatMXN, formatPercent } from '@/lib/utils/format'
import { computeCardFloat } from '@/lib/utils/float'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonList } from '@/components/shared/Skeleton'
import { showToast } from '@/lib/toast'
import { ErrorState } from '@/components/shared/ErrorState'

// Tokens semánticos (shadcn): adaptan claro/oscuro sin overrides.
const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'

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
    else showToast('Saldo actualizado')
    setEditingId(null)
    setBusy(false)
    refresh()
  }

  const deleteCard = async (id: string) => {
    setBusy(true)
    setActionError('')
    const { error } = await supabase.from('credit_cards').update({ is_active: false }).eq('id', id)
    if (error) setActionError(error.message)
    else showToast('Tarjeta eliminada')
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
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        }
      />

      {actionError && <p className="text-red-500 text-sm mb-4">{actionError}</p>}

      {showAdd && <AddCardForm onDone={() => { setShowAdd(false); refresh() }} />}

      {loading ? (
        <SkeletonList rows={2} height="h-40" />
      ) : error ? (
        <ErrorState message="No pudimos cargar tus tarjetas." retry={refresh} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin tarjetas"
          message="Agrega tu primera tarjeta de crédito para controlar su uso y float."
          ctaLabel="Agregar tarjeta"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-4">
          {cards.map((c) => {
            const float = computeCardFloat(c, accounts)
            const utilPct = float.utilization * 100
            return (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.institution}</p>
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
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(c.id)}
                      className="text-muted-foreground hover:text-red-500"
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
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground shrink-0"
                        aria-label="Guardar saldo"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2.5 rounded-xl border border-border shrink-0"
                        aria-label="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo utilizado</p>
                        <p className="text-xl font-bold text-foreground">
                          {formatMXN(Number(c.current_balance))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          de {formatMXN(Number(c.credit_limit))}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingId(c.id)
                          setEditValue(String(c.current_balance))
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </>
                  )}
                </div>

                {/* Utilización */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilización</span>
                    <span className={utilPct >= 80 ? 'text-red-500 font-medium' : ''}>
                      {utilPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${utilPct >= 80 ? 'bg-red-500' : 'bg-foreground'}`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>

                {/* Float + días */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Días para pago</p>
                    <p className="font-semibold text-foreground">
                      {float.daysToPayment !== null ? `${float.daysToPayment} días` : '—'}
                    </p>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Float del periodo</p>
                    <p className="font-semibold text-foreground">{formatMXN(float.benefit)}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {totalFloat > 0 && (
            <p className="text-xs text-muted-foreground text-center px-4">
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
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-4 space-y-3">
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
          className="shrink-0 inline-flex items-center gap-1 px-3 rounded-xl border border-border text-sm text-muted-foreground hover:border-foreground disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {searching ? '…' : 'Buscar'}
        </button>
      </div>

      {info && (
        <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3">{info}</p>
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
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar tarjeta'}
      </button>
    </div>
  )
}
