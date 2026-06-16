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
  supports_subaccounts: boolean
  last_updated: string
  created_at: string
}

export interface Subaccount {
  id: string
  user_id: string
  account_id: string
  name: string
  balance: number
  yield_rate: number
  effective_yield: number
  goal_amount: number | null
  goal_name: string | null
  color: string | null
  icon: string | null
  is_active: boolean
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
  previous_balance: number
  last_cut_date: string | null
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
  is_hidden: boolean
  sort_order: number
  created_at: string
}

export type RecurringFrequency = 'monthly' | 'biweekly' | 'weekly' | 'custom'

export interface RecurringItem {
  id: string
  user_id: string
  name: string
  amount: number
  type: 'expense' | 'income'
  category_id: string | null
  account_id: string | null
  card_id: string | null
  frequency: RecurringFrequency
  day_of_month: number[] | null
  day_of_week: number | null
  is_active: boolean
  next_date: string | null
  last_triggered: string | null
  notes: string | null
  created_at: string
}
