import { Check } from 'lucide-react'

export const PALETTE = [
  '#00b1ea', // Mercado Pago azul
  '#7b2fff', // Nu morado
  '#ec0000', // Santander rojo
  '#006EB2', // BBVA azul
  '#F59E0B', // Oro/dorado
  '#10B981', // Verde esmeralda
  '#6366F1', // Indigo
  '#EF4444', // Rojo
  '#EC4899', // Rosa
  '#8B5CF6', // Violeta
  '#14B8A6', // Teal
  '#64748B', // Gris azulado
]

/** Fila de círculos de colores tocables. El seleccionado lleva un check blanco. */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Color ${color}`}
            aria-pressed={selected}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}
