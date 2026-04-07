import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { getAdminFromToken } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminFromToken()

  // No valid token at all — bounce to login
  // (Middleware handles most cases, but this is belt-and-suspenders for
  //  the layout itself, which middleware doesn't cover for all edge cases.)
  if (!admin) {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar role={admin.role} adminName={admin.email} />
      <main className="flex-1 p-6 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
