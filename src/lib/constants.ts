import type { AccountType, TransactionType } from '@/types/finance'

export const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'withdrawal', label: 'Retiro' },
  { value: 'card_payment', label: 'Pago de tarjeta' },
  { value: 'deposit', label: 'Depósito' },
]

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'debit', label: 'Débito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'savings', label: 'Ahorro / Inversión líquida' },
  { value: 'investment', label: 'Inversión' },
]

export const CATEGORIES = [
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
] as const

export type CategoryName = (typeof CATEGORIES)[number]

// Categorías consideradas esenciales para distinguir gasto "hormiga".
export const ESSENTIAL_CATEGORIES: CategoryName[] = [
  'Alimentación',
  'Hogar',
  'Salud',
  'Servicios',
  'Educación',
  'Transporte',
]

export function typeLabel(value: string): string {
  return TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value
}

export function accountTypeLabel(value: string): string {
  return ACCOUNT_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value
}

// Cuentas/tarjetas iniciales (espejo del seed SQL) para el botón de setup manual.
export const INITIAL_ACCOUNTS = [
  { name: 'Mercado Pago', type: 'savings' as AccountType, yield_rate: 0.15, institution: 'Mercado Pago', color: '#00b1ea' },
  { name: 'Santander débito', type: 'debit' as AccountType, yield_rate: 0, institution: 'Santander', color: '#ec0000' },
  { name: 'Efectivo', type: 'cash' as AccountType, yield_rate: 0, institution: null, color: '#22c55e' },
]

export const INITIAL_CARDS = [
  { name: 'BBVA Azul', cut_day: 15, payment_day: 5, credit_limit: 30000, institution: 'BBVA' },
  { name: 'Santander Zero', cut_day: 22, payment_day: 12, credit_limit: 20000, institution: 'Santander' },
]
