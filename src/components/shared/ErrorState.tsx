import { AlertCircle } from 'lucide-react'

/**
 * Estado de error consistente para pantallas con fetch de datos.
 * Si se pasa `retry`, muestra un botón "Reintentar".
 */
export function ErrorState({
  title = 'Algo salió mal',
  message,
  retry,
}: {
  title?: string
  message: string
  retry?: () => void
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 mx-auto flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mt-4">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="inline-block mt-5 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
