'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRecurring } from '@/hooks/useRecurring'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { formatMXN, formatShortDate } from '@/lib/utils/format'
import { nextOccurrenceDate, frequencyLabel } from '@/lib/utils/recurringItems'
import { showToast } from '@/lib/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import type { RecurringFrequency, RecurringItem } from '@/types/finance'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'custom', label: 'Personalizado' },
]

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function RecurrentesPage() {
  const { items, loading, refresh } = useRecurring()
  const { visible: categories } = useCategories()
  const { accounts } = useAccounts()
  const { cards } = useCards()
  const [showAdd, setShowAdd] = useState(false)

  const supabase = createClient()

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const acctName = useMemo(() => {
    const m = new Map<string, string>()
    accounts.forEach((a) => m.set(a.id, a.name))
    cards.forEach((c) => m.set(c.id, c.name))
    return m
  }, [accounts, cards])

  const expenses = items.filter((i) => i.type === 'expense')
  const incomes = items.filter((i) => i.type === 'income')

  const remove = async (id: string) => {
    await supabase.from('recurring_items').update({ is_active: false }).eq('id', id)
    showToast('Recurrente eliminado')
    refresh()
  }

  const renderItem = (item: RecurringItem) => {
    const cat = item.category_id ? catById.get(item.category_id) : null
    const next = nextOccurrenceDate(item)
    const where = item.account_id
      ? acctName.get(item.account_id)
      : item.card_id
        ? acctName.get(item.card_id)
        : null
    return (
      <div key={item.id} className="flex items-center gap-3 p-4">
        <span className="text-lg w-7 text-center">{cat?.icon ?? (item.type === 'income' ? '💼' : '🔁')}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {frequencyLabel(item)}
            {next ? ` · próx. ${formatShortDate(next)}` : ''}
            {where ? ` · ${where}` : ''}
          </p>
        </div>
        <span className="text-sm font-semibold text-foreground shrink-0">
          {item.type === 'income' ? '+' : '−'}
          {formatMXN(Number(item.amount))}
        </span>
        <button
          onClick={() => remove(item.id)}
          className="text-muted-foreground hover:text-red-500 shrink-0"
          aria-label="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader
        title="Recurrentes"
        subtitle="Gastos e ingresos fijos"
        action={
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        }
      />

      {showAdd && (
        <AddRecurringForm
          onDone={() => {
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin recurrentes"
          message="Registra tus gastos e ingresos fijos (suscripciones, renta, nómina) para mejorar tus proyecciones."
          ctaLabel="Agregar recurrente"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-6">
          {expenses.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-2">Gastos fijos</h2>
              <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
                {expenses.map(renderItem)}
              </div>
            </section>
          )}
          {incomes.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-2">Ingresos fijos</h2>
              <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
                {incomes.map(renderItem)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function AddRecurringForm({ onDone }: { onDone: () => void }) {
  const { visible: categories } = useCategories()
  const { accounts } = useAccounts()
  const { cards } = useCards()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [target, setTarget] = useState('') // "acc:<id>" | "card:<id>"
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>([1])
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const toggleDay = (d: number) =>
    setDaysOfMonth((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))

  const submit = async () => {
    if (!name.trim() || amount <= 0) {
      setError('Nombre y monto son obligatorios.')
      return
    }
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

    const accountId = target.startsWith('acc:') ? target.slice(4) : null
    const cardId = target.startsWith('card:') ? target.slice(5) : null
    const isWeekly = frequency === 'weekly'

    const item = {
      user_id: user.id,
      name: name.trim(),
      amount,
      type,
      category_id: categoryId || null,
      account_id: accountId,
      card_id: cardId,
      frequency,
      day_of_month: isWeekly ? null : daysOfMonth,
      day_of_week: isWeekly ? dayOfWeek : null,
      notes: notes.trim() || null,
    }
    const next = nextOccurrenceDate({ ...item } as RecurringItem)

    const { error } = await supabase
      .from('recurring_items')
      .insert({ ...item, next_date: next ? next.toISOString().slice(0, 10) : null })

    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    showToast('Recurrente creado')
    onDone()
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-4 space-y-3">
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              type === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre (p. ej. Spotify, Nómina)"
        className={inputClass}
      />
      <CurrencyInput value={amount} onChange={setAmount} placeholder="Monto" className={inputClass} />

      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
        <option value="">Categoría (opcional)</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>

      <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
        <option value="">Cuenta o tarjeta (opcional)</option>
        {accounts.map((a) => (
          <option key={a.id} value={`acc:${a.id}`}>
            {a.name}
          </option>
        ))}
        {cards.map((c) => (
          <option key={c.id} value={`card:${c.id}`}>
            {c.name} (TDC)
          </option>
        ))}
      </select>

      <select
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
        className={inputClass}
      >
        {FREQUENCIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {frequency === 'weekly' ? (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Día de la semana</label>
          <div className="flex gap-1">
            {WEEKDAYS.map((w, i) => (
              <button
                key={w}
                onClick={() => setDayOfWeek(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                  dayOfWeek === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Día(s) del mes {frequency === 'biweekly' ? '(elige 2)' : ''}
          </label>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`py-1.5 rounded-lg text-xs font-medium ${
                  daysOfMonth.includes(d)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        className={inputClass}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar recurrente'}
      </button>
    </div>
  )
}
