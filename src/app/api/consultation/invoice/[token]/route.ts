import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderInvoicePdf } from '@/lib/pdf'
import { loadInvoiceSeller } from '@/lib/invoiceConfig'
import { countryName } from '@/lib/consultationGeo'
import { SKU_LABEL, type DurationSku } from '@/lib/consultationCheckoutPricing'
import type { InvoiceData } from '@/components/pdf/GSTInvoice'

// GET /api/consultation/invoice/<schedule_token> — the paid buyer's tax/export invoice.
// Gated by the schedule_token (unguessable; only the buyer has it).

const PROJECT_LABEL: Record<string, string> = {
  type1: 'Agentic AI / System Design & Governance',
  type2: 'Quantum AI / Infrastructure-grade AI',
  type3: 'Business Intelligence & Data Strategy',
  type4: 'Bespoke AI consulting',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) return new NextResponse('Missing token.', { status: 400 })

  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('consultation_orders')
    .select('*')
    .eq('schedule_token', token)
    .maybeSingle()

  if (!order) return new NextResponse('Booking not found.', { status: 404 })
  if (order.status !== 'paid' && order.status !== 'scheduled') {
    return new NextResponse('Invoice not available yet.', { status: 400 })
  }

  const seller = await loadInvoiceSeller(supabase)
  const isDomestic = order.tax_regime === 'domestic_gst'
  const dateIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(order.updated_at ?? order.created_at ?? Date.now()),
  )
  const line = `Expert Consultation — ${PROJECT_LABEL[order.project_type_code] ?? 'AI consulting'} · ${
    SKU_LABEL[order.duration_sku as DurationSku] ?? `${order.sessions ?? 1} session(s)`
  }`

  const invoice: InvoiceData = isDomestic
    ? {
        number: order.invoice_number || `CONSULT-${String(order.id).slice(0, 8)}`,
        date: dateIso,
        mode: 'domestic',
        currency: 'INR',
        buyerName: order.buyer_name || 'Customer',
        buyerAddress: order.billing_address ?? null,
        buyerGstin: order.billing_gstin ?? null,
        buyerCountry: 'India',
        buyerState: order.billing_state ?? null,
        lineDescription: line,
        taxable: Number(order.taxable_inr) || 0,
        gstRate: Number(order.gst_rate) || 18,
        cgst: Number(order.cgst_inr) || 0,
        sgst: Number(order.sgst_inr) || 0,
        igst: Number(order.igst_inr) || 0,
        total: Number(order.total_inr) || 0,
        paymentRef: order.razorpay_payment_id ?? null,
      }
    : {
        number: order.invoice_number || `CONSULT-${String(order.id).slice(0, 8)}`,
        date: dateIso,
        mode: 'export',
        currency: 'USD',
        buyerName: order.buyer_name || 'Customer',
        buyerAddress: order.billing_address ?? null,
        buyerCountry: countryName(order.billing_country),
        lineDescription: line,
        taxable: Number(order.total_usd) || 0,
        total: Number(order.total_usd) || 0,
        paymentRef: order.razorpay_payment_id ?? null,
      }

  try {
    const pdf = await renderInvoicePdf(seller, invoice)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.number.replace(/[^\w.-]/g, '_')}.pdf"`,
      },
    })
  } catch (e: any) {
    console.error('[consultation invoice]', e?.message)
    return new NextResponse('Could not generate the invoice.', { status: 500 })
  }
}
