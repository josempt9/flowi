'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Captura el retorno del OAuth nativo (deep link com.flowi.app://auth/callback?code=…),
 * intercambia el código por sesión y entra a la app. Solo actúa dentro del APK.
 * Renderizar una vez en el root layout.
 */
export function NativeAuthHandler() {
  const router = useRouter()

  useEffect(() => {
    let remove = () => {}
    let active = true

    const setup = async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform() || !active) return

      const { App } = await import('@capacitor/app')
      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.includes('auth/callback')) return
        try {
          const { Browser } = await import('@capacitor/browser')
          await Browser.close().catch(() => {})

          const code = new URL(url).searchParams.get('code')
          if (code) {
            const supabase = createClient()
            await supabase.auth.exchangeCodeForSession(code)
            router.push('/registro')
          }
        } catch {
          // Si algo falla, el usuario sigue en login y puede reintentar.
        }
      })
      remove = () => listener.remove()
    }

    setup()
    return () => {
      active = false
      remove()
    }
  }, [router])

  return null
}
