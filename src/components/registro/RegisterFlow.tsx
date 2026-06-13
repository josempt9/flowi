'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Mic } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signedAmount } from '@/lib/utils/transactions'
import { createRecognition, speechSupported, type SpeechRecognitionLike } from '@/lib/speech'
import type { TransactionType } from '@/types/finance'

const ACCOUNTS = ['Mercado Pago', 'Santander débito', 'Efectivo'] as const

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'withdrawal', label: 'Retiro' },
  { value: 'card_payment', label: 'Pago de tarjeta' },
  { value: 'deposit', label: 'Depósito' },
]

const CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Hogar',
  'Salud',
  'Entretenimiento',
  'Ropa',
  'Educación',
  'Nómina',
  'Servicios',
  'General',
]

type ParsedTransaction = {
  type: string
  amount: number
  account: string | null
  card: string | null
  category: string
  description: string
  confidence: number
  confidence_reason: string
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function typeLabel(value: string) {
  return TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400'

/**
 * Flujo de registro de transacciones (3 pasos: input → confirmación → éxito).
 * Reutilizado por la página `/registro` y por el bottom sheet de registro rápido.
 * - onSaved: se llama tras guardar (para refrescar datos en otras pantallas).
 * - onClose: si se provee (modo sheet), muestra botón "Cerrar" al terminar.
 */
export function RegisterFlow({
  onSaved,
  onClose,
}: {
  onSaved?: () => void
  onClose?: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<ParsedTransaction | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListeningRef = useRef(false) // intención del usuario (vs cortes automáticos)
  const finalTranscriptRef = useRef('') // texto final acumulado entre sesiones

  const supabase = createClient()

  useEffect(() => {
    setVoiceSupported(speechSupported())
    return () => {
      wantListeningRef.current = false
      recognitionRef.current?.stop()
    }
  }, [])

  const launchRecognition = () => {
    const rec = createRecognition()
    if (!rec) {
      wantListeningRef.current = false
      setListening(false)
      return
    }
    rec.lang = 'es-MX'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setInput((finalTranscriptRef.current + interim).trim())
    }

    rec.onerror = (event) => {
      // no-speech / aborted: NO cerramos; onend reintenta solo.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      // Errores reales (permiso denegado, etc.): cerramos.
      wantListeningRef.current = false
      setListening(false)
    }

    rec.onend = () => {
      // Android Chrome corta la sesión solo; si el usuario no detuvo, reiniciamos.
      if (wantListeningRef.current) {
        setTimeout(() => {
          if (wantListeningRef.current) {
            try {
              rec.start()
            } catch {
              // ya iniciado o estado inválido: ignorar
            }
          }
        }, 100)
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = rec
    // En Android Chrome un start() inmediato a veces no engancha: pequeño delay.
    setTimeout(() => {
      if (wantListeningRef.current) {
        try {
          rec.start()
        } catch {
          // noop
        }
      }
    }, 100)
  }

  const startVoice = () => {
    if (!speechSupported()) return
    wantListeningRef.current = true
    finalTranscriptRef.current = input.trim() ? input.trim() + ' ' : ''
    setListening(true)
    launchRecognition()
  }

  const stopVoice = () => {
    wantListeningRef.current = false
    setListening(false)
    recognitionRef.current?.stop()
  }

  const toggleVoice = () => {
    if (listening) stopVoice()
    else startVoice()
  }

  const handleTicket = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/scan-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mediaType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo leer el ticket.')
        return
      }
      setInput(`Ticket: ${data.description ?? ''}`.trim())
      setParsed(data as ParsedTransaction)
      setEditing(null)
      setStep(2)
    } catch {
      setError('Error al procesar la imagen del ticket.')
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  const handleParse = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, accounts: ACCOUNTS, aliases: [] }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo interpretar la transacción.')
        return
      }
      setParsed(data as ParsedTransaction)
      setEditing(null)
      setStep(2)
    } catch {
      setError('Error de red al contactar el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = <K extends keyof ParsedTransaction>(
    key: K,
    value: ParsedTransaction[K]
  ) => {
    setParsed((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!parsed) return
    setSaving(true)
    setError('')
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Tu sesión expiró. Vuelve a iniciar sesión.')
        return
      }

      // La IA devuelve el nombre de la cuenta; transactions usa account_id (uuid).
      let accountId: string | null = null
      if (parsed.account) {
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', parsed.account)
          .maybeSingle()
        accountId = account?.id ?? null
      }

      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: parsed.type,
        amount: parsed.amount,
        account_id: accountId,
        description: parsed.description,
        raw_input: input,
        ai_category: parsed.category,
        confidence_score: parsed.confidence,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Actualiza el saldo de la cuenta afectada (income suma, gasto resta).
      if (accountId) {
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', accountId)
          .maybeSingle()
        if (account) {
          const newBalance =
            Number(account.balance) +
            signedAmount(parsed.type as TransactionType, parsed.amount)
          await supabase
            .from('accounts')
            .update({ balance: newBalance, last_updated: new Date().toISOString() })
            .eq('id', accountId)
        }
      }

      setSaved(parsed)
      setStep(3)
      onSaved?.()
    } catch {
      setError('Error inesperado al guardar la transacción.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep(1)
    setInput('')
    setParsed(null)
    setSaved(null)
    setEditing(null)
    setError('')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-black dark:bg-white' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* PASO 1 — Texto libre */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">Registrar movimiento</h1>
          <p className="text-gray-500 text-sm mt-1">
            Escribe el movimiento como lo dirías en voz alta.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Café $65 Mercado Pago"
            className={`${inputClass} mt-6 resize-none`}
          />

          <div
            className={`mt-3 grid gap-2 ${voiceSupported ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm transition-colors ${
                  listening
                    ? 'border-red-500 text-red-500'
                    : 'border-gray-200 text-gray-600 hover:border-black'
                }`}
              >
                {listening ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    Detener
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Dictar
                  </>
                )}
              </button>
            )}
            <label className="flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:border-black cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              {scanning ? 'Leyendo ticket…' : 'Foto del ticket'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleTicket}
                disabled={scanning}
                className="hidden"
              />
            </label>
          </div>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

          <button
            onClick={handleParse}
            disabled={loading || input.trim() === ''}
            className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
          >
            {loading ? 'Interpretando…' : 'Continuar'}
          </button>
        </div>
      )}

      {/* PASO 2 — Confirmación */}
      {step === 2 && parsed && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Confirma los datos</h1>
            <ConfidenceBadge value={parsed.confidence} />
          </div>
          <p className="text-gray-500 text-sm mt-1 italic">“{input}”</p>

          <div className="mt-6 divide-y divide-gray-100">
            <Field
              label="Tipo"
              value={typeLabel(parsed.type)}
              editing={editing === 'type'}
              onEdit={() => setEditing('type')}
              onDone={() => setEditing(null)}
            >
              <select
                value={parsed.type}
                onChange={(e) => updateField('type', e.target.value)}
                className={inputClass}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Monto"
              value={currency.format(parsed.amount)}
              editing={editing === 'amount'}
              onEdit={() => setEditing('amount')}
              onDone={() => setEditing(null)}
            >
              <input
                type="number"
                min={0}
                step="0.01"
                value={parsed.amount}
                onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Cuenta"
              value={parsed.account ?? 'Sin cuenta'}
              editing={editing === 'account'}
              onEdit={() => setEditing('account')}
              onDone={() => setEditing(null)}
            >
              <select
                value={parsed.account ?? ''}
                onChange={(e) => updateField('account', e.target.value || null)}
                className={inputClass}
              >
                <option value="">Sin cuenta</option>
                {ACCOUNTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Categoría"
              value={parsed.category}
              editing={editing === 'category'}
              onEdit={() => setEditing('category')}
              onDone={() => setEditing(null)}
            >
              <select
                value={parsed.category}
                onChange={(e) => updateField('category', e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-black text-white py-4 rounded-xl text-base font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
          >
            {saving ? 'Guardando…' : 'Confirmar y guardar'}
          </button>
          <button
            onClick={() => {
              setStep(1)
              setError('')
            }}
            disabled={saving}
            className="w-full text-gray-500 py-3 rounded-xl text-sm font-medium hover:text-black transition-colors mt-1"
          >
            Reescribir
          </button>
        </div>
      )}

      {/* PASO 3 — Éxito */}
      {step === 3 && saved && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-full mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Movimiento guardado</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tu transacción se registró correctamente.
          </p>

          <div className="mt-6 text-left bg-gray-50 rounded-xl p-5 space-y-3">
            <SummaryRow label="Tipo" value={typeLabel(saved.type)} />
            <SummaryRow label="Monto" value={currency.format(saved.amount)} />
            <SummaryRow label="Cuenta" value={saved.account ?? 'Sin cuenta'} />
            <SummaryRow label="Categoría" value={saved.category} />
            {saved.description && <SummaryRow label="Descripción" value={saved.description} />}
          </div>

          <button
            onClick={reset}
            className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors mt-6"
          >
            Registrar otro
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full text-gray-500 py-3 rounded-xl text-sm font-medium hover:text-black transition-colors mt-1"
            >
              Cerrar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  editing,
  onEdit,
  onDone,
  children,
}: {
  label: string
  value: string
  editing: boolean
  onEdit: () => void
  onDone: () => void
  children: React.ReactNode
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {editing ? (
          <button onClick={onDone} className="text-sm font-medium text-black hover:underline">
            Listo
          </button>
        ) : (
          <button
            onClick={onEdit}
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            editar
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2">{children}</div>
      ) : (
        <p className="text-base font-medium text-gray-900 mt-0.5">{value}</p>
      )}
    </div>
  )
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="text-right">
      <span className="text-xs text-gray-400">Confianza</span>
      <div className="flex items-center gap-2 mt-0.5">
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-black dark:bg-white" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-900">{pct}%</span>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
