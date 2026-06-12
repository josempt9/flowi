import type { SupabaseClient } from '@supabase/supabase-js'
import { signedAmount } from '@/lib/utils/transactions'
import type { TransactionType } from '@/types/finance'

/**
 * Ajusta el saldo de una cuenta sumando `delta` (puede ser negativo).
 * Lee el saldo actual y lo reescribe. No-op si no hay cuenta o delta es 0.
 */
export async function adjustBalance(
  supabase: SupabaseClient,
  accountId: string | null,
  delta: number
): Promise<void> {
  if (!accountId || delta === 0) return
  const { data } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .maybeSingle()
  if (!data) return
  await supabase
    .from('accounts')
    .update({
      balance: Number(data.balance) + delta,
      last_updated: new Date().toISOString(),
    })
    .eq('id', accountId)
}

/** Aplica el efecto de una transacción al saldo de su cuenta. */
export async function applyToBalance(
  supabase: SupabaseClient,
  accountId: string | null,
  type: TransactionType,
  amount: number
): Promise<void> {
  await adjustBalance(supabase, accountId, signedAmount(type, amount))
}

/** Revierte el efecto de una transacción (para edición o borrado). */
export async function reverseFromBalance(
  supabase: SupabaseClient,
  accountId: string | null,
  type: TransactionType,
  amount: number
): Promise<void> {
  await adjustBalance(supabase, accountId, -signedAmount(type, amount))
}

interface TxEffect {
  account_id: string | null
  type: TransactionType
  amount: number
}

/**
 * Reconcilia los saldos al editar una transacción: revierte el efecto previo
 * y aplica el nuevo. Funciona aunque cambie de cuenta (se hace secuencial).
 */
export async function reconcileEdit(
  supabase: SupabaseClient,
  before: TxEffect,
  after: TxEffect
): Promise<void> {
  await reverseFromBalance(supabase, before.account_id, before.type, before.amount)
  await applyToBalance(supabase, after.account_id, after.type, after.amount)
}
