import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/**
 * Estado vacío consistente: ícono grande gris, título, subtítulo y CTA.
 * El CTA puede ser un link (`href`) o una acción (`onAction`).
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  ctaLabel,
  href,
  onAction,
}: {
  icon: LucideIcon
  title: string
  message: string
  ctaLabel?: string
  href?: string
  onAction?: () => void
}) {
  const cta = ctaLabel && (href || onAction)

  return (
    <div className="bg-white dark:bg-zinc-900 border border-dashed border-gray-200 rounded-2xl p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mt-4">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{message}</p>

      {cta &&
        (href ? (
          <Link
            href={href}
            className="inline-block mt-5 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            {ctaLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="inline-block mt-5 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            {ctaLabel}
          </button>
        ))}
    </div>
  )
}
