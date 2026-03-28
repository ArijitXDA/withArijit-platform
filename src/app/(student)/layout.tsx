import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopNav } from '@/components/dashboard/DashboardTopNav'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#0a0d14' }}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopNav />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
