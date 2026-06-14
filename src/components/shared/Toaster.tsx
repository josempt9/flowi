'use client'

import { useEffect, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { TOAST_EVENT, type ToastPayload } from '@/lib/toast'

/**
 * Renderiza toasts breves (2s) que aparecen desde abajo. Verde=éxito, rojo=error.
 * Escucha el evento global `flowi:toast`. Montar una vez en el root layout.
 */
export function Toaster() {
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>
    let clearTimer: ReturnType<typeof setTimeout>

    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail
      setToast(detail)
      setVisible(true)
      clearTimeout(hideTimer)
      clearTimeout(clearTimer)
      hideTimer = setTimeout(() => setVisible(false), 2000)
      clearTimer = setTimeout(() => setToast(null), 2300)
    }

    window.addEventListener(TOAST_EVENT, onToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      clearTimeout(hideTimer)
      clearTimeout(clearTimer)
    }
  }, [])

  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 ${
          isError ? 'bg-red-600' : 'bg-green-600'
        } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
      >
        {isError ? (
          <AlertCircle className="w-4 h-4 shrink-0" />
        ) : (
          <Check className="w-4 h-4 shrink-0" />
        )}
        {toast.message}
      </div>
    </div>
  )
}
