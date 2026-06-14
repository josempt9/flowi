'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { QuickRegisterSheet } from '@/components/registro/QuickRegisterSheet'
import { OPEN_REGISTER_EVENT } from '@/lib/events'
import {
  BarChart3,
  CreditCard,
  History,
  Home,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Settings,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const LEFT = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/cuentas', label: 'Cuentas', icon: Wallet },
]

const RIGHT = [
  { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
]

const MORE = [
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/presupuestos', label: 'Presupuestos', icon: PiggyBank },
  { href: '/proyecciones', label: 'Proyecciones', icon: TrendingUp },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  // Permite abrir el sheet de registro desde cualquier pantalla (estados vacíos).
  useEffect(() => {
    const open = () => setRegisterOpen(true)
    window.addEventListener(OPEN_REGISTER_EVENT, open)
    return () => window.removeEventListener(OPEN_REGISTER_EVENT, open)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  const moreActive = MORE.some((m) => pathname.startsWith(m.href))

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white/90 backdrop-blur">
        <div className="max-w-md mx-auto px-2 h-16 grid grid-cols-6 items-center">
          {LEFT.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}

          {/* Botón central de registro → bottom sheet rápido */}
          <div className="flex justify-center">
            <button
              onClick={() => setRegisterOpen(true)}
              aria-label="Registrar movimiento"
              className="-mt-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-white shadow-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          {RIGHT.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Más opciones"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
              moreActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            Más
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <QuickRegisterSheet open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </>
  )
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        className={`absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Más</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
              >
                <item.icon className="w-5 h-5 text-black" />
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
        active ? 'text-black' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  )
}
