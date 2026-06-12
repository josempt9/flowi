'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { PageHeader } from '@/components/shared/PageHeader'

export default function AjustesPage() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const logout = async () => {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-28">
      <PageHeader title="Ajustes" subtitle="Preferencias y sesión" />

      <div className="space-y-4">
        <ThemeToggle />

        <button
          onClick={logout}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">Flowi · Inteligencia financiera personal</p>
    </div>
  )
}
