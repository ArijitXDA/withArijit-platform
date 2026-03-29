import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound }  from 'next/navigation'
import type { Metadata }       from 'next'
import './invoice.css'
import InvoiceClient from './InvoiceClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>
}): Promise<Metadata> {
  const { invoiceNumber } = await params
  return {
    title: `Tax Invoice ${invoiceNumber} | oStaran`,
    description: 'GST Tax Invoice — oStaran AI Education Platform',
  }
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>
}) {
  const { invoiceNumber } = await params

  // Auth — must be a signed-in student
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin?next=/dashboard/payments')

  const service = createServiceClient()

  // Fetch the transaction
  const { data: txn } = await service
    .from('payment_transactions')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .single()

  if (!txn) notFound()

  // Security: student can only see their own invoices
  if (txn.student_email.toLowerCase() !== user.email!.toLowerCase()) {
    notFound()
  }

  // Fetch company settings
  const { data: company } = await service
    .from('company_invoice_settings')
    .select('*')
    .eq('id', 1)
    .single()

  return <InvoiceClient txn={txn} company={company} />
}
