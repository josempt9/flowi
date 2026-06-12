'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { RegisterFlow } from '@/components/registro/RegisterFlow'
import { notifyDataChanged } from '@/lib/events'

/**
 * Bottom sheet deslizable para registrar un movimiento sin cambiar de pantalla.
 * Reinicia el flujo en cada apertura (via key) y refresca datos al guardar.
 */
export function QuickRegisterSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    if (open) setRenderKey((k) => k + 1)
  }, [open])

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute bottom-0 inset-x-0 bg-gray-50 rounded-t-3xl shadow-xl transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto p-4 pt-3 pb-8">
          <div className="flex justify-center">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          <div className="flex justify-end -mt-1 mb-2">
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <RegisterFlow key={renderKey} onSaved={notifyDataChanged} onClose={onClose} />
        </div>
      </div>
    </div>
  )
}
