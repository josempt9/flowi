// Tipos del dominio Flowi — espejo de las tablas de Supabase.

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'withdrawal'
  | 'card_payment'
  | 'deposit'

export type AccountType = 'debit' | 'cash' | 'savings' | 'investment'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  yield_rate: number | null
  institution: string | null
  color: string | null
  is_active: boolean
  last_updated: string
  created_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  credit_limit: number
  current_balance: number
  cut_day: number | null
  payment_day: number | null
  grace_days: number
  annual_fee: number
  cashback_rate: number
  cat: number | null
  institution: string | null
  is_active: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  card_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  raw_input: string | null
  category_id: string | null
  ai_category: string | null
  confidence_score: number | null
  date: string
  transfer_pair_id: string | null
  is_recurring: boolean
  msi_months: number | null
  notes: string | null
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  created_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  is_essential: boolean
  parent_id: string | null
  created_at: string
}
