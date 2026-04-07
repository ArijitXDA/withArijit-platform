import { redirect } from 'next/navigation'
import { getAdminFromToken, canAccess } from '@/lib/admin-auth'

export default async function AdminPartnersPage() {
  const admin = await getAdminFromToken()
  if (!admin || !canAccess(admin, 'partners')) redirect('/admin/dashboard?denied=1')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Partners</h1>
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Partner management coming soon.</p>
      </div>
    </div>
  )
}
