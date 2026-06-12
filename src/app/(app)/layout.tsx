import { BottomNav } from '@/components/shared/BottomNav'

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <BottomNav />
    </div>
  )
}
