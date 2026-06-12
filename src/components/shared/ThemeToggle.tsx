'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // localStorage no disponible — ignorar.
    }
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-gray-900">
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        Modo oscuro
      </span>
      <span
        className={`relative w-11 h-6 rounded-full transition-colors ${
          dark ? 'bg-black' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            dark ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}
