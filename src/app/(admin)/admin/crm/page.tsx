import { redirect } from 'next/navigation'
import { getAdminFromToken, canAccess } from '@/lib/admin-auth'

export default async function AdminCrmPage() {
  const admin = await getAdminFromToken()
  if (!admin || !canAccess(admin, 'crm')) redirect('/admin/dashboard?denied=1')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">CRM — Super Admin</h1>
      <p className="text-gray-500">Full CRM access. Signed in as: {admin.email}</p>
    </div>
  )
}
