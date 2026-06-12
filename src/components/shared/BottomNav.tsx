'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CreditCard,
  Home,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react'

const LEFT = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/cuentas', label: 'Cuentas', icon: Wallet },
]

const RIGHT = [
  { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white/90 backdrop-blur">
      <div className="max-w-md mx-auto px-2 h-16 grid grid-cols-5 items-center">
        {LEFT.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* Botón central de registro */}
        <div className="flex justify-center">
          <Link
            href="/registro"
            aria-label="Registrar movimiento"
            className="-mt-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-white shadow-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        {RIGHT.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
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
