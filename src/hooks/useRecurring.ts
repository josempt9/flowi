'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DATA_CHANGED_EVENT } from '@/lib/events'
import type { RecurringItem } from '@/types/finance'

export function useRecurring() {
  const [items, setItems] = useState<RecurringItem[]>([])
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
    const { data, error } = await supabase
      .from('recurring_items')
      .select(
        'id, user_id, name, amount, type, category_id, account_id, card_id, frequency, day_of_month, day_of_week, is_active, next_date, last_triggered, notes, created_at'
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else {
      setItems(data as RecurringItem[])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener(DATA_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
  }, [refresh])

  return { items, loading, error, refresh }
}
