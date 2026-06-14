'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DATA_CHANGED_EVENT } from '@/lib/events'
import type { Transaction } from '@/types/finance'

export function useTransactions(limit?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión no válida')
      setLoading(false)
      return
    }
    let query = supabase
      .from('transactions')
      .select(
        'id, user_id, account_id, card_id, type, amount, description, raw_input, category_id, ai_category, confidence_score, date, transfer_pair_id, is_recurring, msi_months, notes, created_at'
      )
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (limit) query = query.limit(limit)

    const { data, error } = await query

    if (error) setError(error.message)
    else {
      setTransactions(data as Transaction[])
      setError(null)
    }
    setLoading(false)
  }, [limit])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener(DATA_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
  }, [refresh])

  return { transactions, loading, error, refresh }
}
