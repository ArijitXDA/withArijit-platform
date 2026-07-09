import { redirect } from 'next/navigation'
import { getAdminFromToken, canAccess } from '@/lib/admin-auth'
import { getFxRates } from '@/lib/fxRates'
import { CurrencyRatesForm } from './CurrencyRatesForm'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const admin = await getAdminFromToken()
  if (!admin || !canAccess(admin, 'settings')) redirect('/admin/dashboard?denied=1')

  const rates = await getFxRates()

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Global configuration.</p>
      </div>

      <section className="rounded-xl border p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Currency exchange rates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set the value of 1 USD and 1 EUR in INR. These drive the prices shown to international
            visitors — and, once foreign-currency charging is live, the amount charged. The rate is
            snapshotted onto each order at purchase, so changing it here never alters past receipts.
          </p>
        </div>
        <CurrencyRatesForm initial={rates} />
      </section>
    </div>
  )
}
