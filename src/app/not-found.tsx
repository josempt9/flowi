import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-4">
          <span className="text-white font-bold text-lg">F</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Página no encontrada</h1>
        <p className="text-gray-500 text-sm mt-2">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
