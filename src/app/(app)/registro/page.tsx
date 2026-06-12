'use client'

import { RegisterFlow } from '@/components/registro/RegisterFlow'
import { notifyDataChanged } from '@/lib/events'

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-12">
      <RegisterFlow onSaved={notifyDataChanged} />
    </div>
  )
}
