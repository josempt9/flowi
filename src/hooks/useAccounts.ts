'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DATA_CHANGED_EVENT } from '@/lib/events'
import type { Account } from '@/types/finance'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
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
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else {
      setAccounts(data as Account[])
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

  return { accounts, loading, error, refresh }
}
