'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Fingerprint } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { authenticateBiometric, isBiometricAvailable } from '@/lib/biometric'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Muestra el botón biométrico solo si: el dispositivo tiene biometría (APK
  // nativo) Y ya existe una sesión guardada de Supabase. Sin sesión previa no aplica.
  useEffect(() => {
    let active = true
    const check = async () => {
      const available = await isBiometricAvailable()
      if (!available || !active) return
      const supa = createClient()
      const {
        data: { session },
      } = await supa.auth.getSession()
      if (active && session) setBioAvailable(true)
    }
    check()
    return () => {
      active = false
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/registro')
  }

  const handleBiometric = async () => {
    setError('')
    const ok = await authenticateBiometric('Entra a Flowi con tu biometría')
    if (ok) {
      router.push('/registro')
    } else {
      setError('No se pudo verificar la biometría')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-4">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Flowi</h1>
          <p className="text-gray-500 text-sm mt-1">Tu tesorería personal</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {bioAvailable && (
            <button
              onClick={handleBiometric}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Fingerprint className="w-5 h-5" />
              Entrar con huella digital
            </button>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">o</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleButton />

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/signup" className="text-black font-medium hover:underline">
            Crear cuenta
          </a>
        </p>
      </div>
    </div>
  )
}
