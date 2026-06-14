'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DATA_CHANGED_EVENT } from '@/lib/events'
import { CATEGORIES } from '@/lib/constants'
import type { Category } from '@/types/finance'

/**
 * Categorías del usuario + globales. `names` es la lista visible (personales
 * primero, sin ocultas) para los selectores; cae al constante si la BD está vacía.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
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
      .from('categories')
      .select(
        'id, user_id, name, icon, color, is_essential, parent_id, is_hidden, sort_order, created_at'
      )
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('sort_order', { ascending: true })

    if (error) setError(error.message)
    else {
      setCategories(data as Category[])
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

  // Visibles ordenadas: personales primero, luego sort_order/nombre.
  const visible = [...categories]
    .filter((c) => !c.is_hidden)
    .sort((a, b) => {
      const ap = a.user_id ? 0 : 1
      const bp = b.user_id ? 0 : 1
      if (ap !== bp) return ap - bp
      return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    })

  const names = visible.length
    ? Array.from(new Set(visible.map((c) => c.name)))
    : [...CATEGORIES]

  return { categories, visible, names, loading, error, refresh }
}
