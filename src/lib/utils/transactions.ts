import type { TransactionType } from '@/types/finance'

// Tipos que SUMAN dinero a la cuenta; el resto lo resta.
const INFLOW: TransactionType[] = ['income', 'deposit']

/**
 * Delta con signo que una transacción aplica al saldo de su cuenta.
 * income/deposit suman; expense/withdrawal/card_payment/transfer restan.
 */
export function signedAmount(type: TransactionType, amount: number): number {
  return INFLOW.includes(type) ? amount : -amount
}

export function isInflow(type: TransactionType): boolean {
  return INFLOW.includes(type)
}

/** Convención: la pierna de ENTRADA de una transferencia empieza así. */
const TRANSFER_IN_PREFIX = 'Transferencia de'

/** True si la transacción es la pierna de entrada de una transferencia. */
export function isTransferInflow(tx: {
  type: TransactionType
  description?: string | null
}): boolean {
  return tx.type === 'transfer' && (tx.description ?? '').startsWith(TRANSFER_IN_PREFIX)
}

/**
 * Signo de visualización (+/-) de una transacción, considerando transferencias.
 * income/deposit y la pierna de entrada de una transferencia → suman.
 */
export function displayInflow(tx: {
  type: TransactionType
  description?: string | null
}): boolean {
  if (tx.type === 'transfer') return isTransferInflow(tx)
  return INFLOW.includes(tx.type)
}

/** Las transferencias son movimientos internos: no cuentan como ingreso ni gasto. */
export function isInternalTransfer(type: TransactionType): boolean {
  return type === 'transfer'
}
