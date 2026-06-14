// Bloque de carga animado (skeleton). Aproxima la forma del contenido real.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  )
}

/** Lista de "tarjetas" skeleton, útil para listas (movimientos, cuentas, etc.). */
export function SkeletonList({
  rows = 3,
  height = 'h-16',
}: {
  rows?: number
  height?: string
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${height} rounded-2xl`} />
      ))}
    </div>
  )
}
