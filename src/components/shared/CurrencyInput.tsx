'use client'

import { useEffect, useState } from 'react'

// Formatea un string numérico crudo agregando comas de miles (es-MX).
function formatRaw(raw: string): string {
  if (raw === '') return ''
  const [intPart, decPart] = raw.split('.')
  const intFmt = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${intFmt}.${decPart}` : intFmt
}

function formatFromNumber(value: number): string {
  if (!value) return ''
  return formatRaw(String(value))
}

/**
 * Input de monto que separa miles con comas mientras el usuario escribe.
 * Guarda/expone el valor como number; muestra el texto formateado.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder,
  prefix = '$',
  className = '',
  wrapperClassName = 'relative w-full',
  autoFocus,
}: {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  prefix?: string
  className?: string
  wrapperClassName?: string
  autoFocus?: boolean
}) {
  const [display, setDisplay] = useState(formatFromNumber(value))

  // Sincroniza cambios externos del valor (p. ej. reset tras guardar) sin
  // pisar lo que el usuario está escribiendo.
  useEffect(() => {
    const current = parseFloat(display.replace(/,/g, '')) || 0
    if (value !== current) setDisplay(formatFromNumber(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    if (parts.length > 2) raw = `${parts[0]}.${parts.slice(1).join('')}`
    const [intPart, decPart] = raw.split('.')
    const limited = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart
    setDisplay(formatRaw(limited))
    onChange(parseFloat(limited) || 0)
  }

  return (
    <div className={wrapperClassName}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        {prefix}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${className} pl-7`}
      />
    </div>
  )
}
