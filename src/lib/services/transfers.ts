import type { SupabaseClient } from '@supabase/supabase-js'
import { adjustBalance } from '@/lib/services/balances'
import type { Account } from '@/types/finance'

/**
 * Registra una transferencia entre dos cuentas del usuario.
 * Crea DOS transacciones tipo 'transfer' enlazadas por `transfer_pair_id`
 * (pierna de salida y de entrada) y mueve ambos saldos a la vez.
 * Las transferencias no cuentan como ingreso ni gasto en los reportes.
 */
export async function createTransfer(
  supabase: SupabaseClient,
  params: {
    userId: string
    from: Account
    to: Account
    amount: number
    date: string
    notes?: string | null
  }
): Promise<{ error: string | null }> {
  const { userId, from, to, amount, date, notes } = params
  const pairId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(amount)}`

  const { error } = await supabase.from('transactions').insert([
    {
      user_id: userId,
      account_id: from.id,
      type: 'transfer',
      amount,
      description: `Transferencia a ${to.name}`,
      transfer_pair_id: pairId,
      date,
      notes: notes?.trim() || null,
    },
    {
      user_id: userId,
      account_id: to.id,
      type: 'transfer',
      amount,
      description: `Transferencia de ${from.name}`,
      transfer_pair_id: pairId,
      date,
      notes: notes?.trim() || null,
    },
  ])

  if (error) return { error: error.message }

  // Mueve ambos saldos: sale de `from`, entra a `to`.
  await adjustBalance(supabase, from.id, -amount)
  await adjustBalance(supabase, to.id, amount)

  return { error: null }
}

/**
 * Elimina una transferencia completa (ambas piernas) dado el `transfer_pair_id`
 * y revierte ambos saldos.
 */
export async function deleteTransfer(
  supabase: SupabaseClient,
  pairId: string
): Promise<{ error: string | null }> {
  const { data: legs, error } = await supabase
    .from('transactions')
    .select('id, account_id, amount, description')
    .eq('transfer_pair_id', pairId)

  if (error) return { error: error.message }
  if (!legs) return { error: null }

  for (const leg of legs) {
    const isInLeg = String(leg.description ?? '').startsWith('Transferencia de')
    // Revierte: la entrada se resta, la salida se suma.
    await adjustBalance(supabase, leg.account_id, isInLeg ? -Number(leg.amount) : Number(leg.amount))
  }

  await supabase.from('transactions').delete().eq('transfer_pair_id', pairId)
  return { error: null }
}
