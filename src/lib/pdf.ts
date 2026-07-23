import { renderToBuffer, DocumentProps } from '@react-pdf/renderer'
import React, { JSXElementConstructor, ReactElement } from 'react'
import { GSTInvoice, type InvoiceSeller, type InvoiceData } from '@/components/pdf/GSTInvoice'
import { CertificatePDF } from '@/components/pdf/CertificatePDF'

type PDFElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

export async function renderInvoicePdf(seller: InvoiceSeller, invoice: InvoiceData): Promise<Buffer> {
  const element = React.createElement(GSTInvoice, { seller, invoice })
  return renderToBuffer(element as PDFElement) as Promise<Buffer>
}

// Legacy course invoice — domestic INR, 18% inclusive, single line. Buyer state isn't captured
// for course sales, so it defaults to intra-state (CGST+SGST). Seller identity now comes from
// config (real entity + GSTIN) instead of the old hardcoded placeholder.
export async function generateGSTInvoice(
  payment: { id: string; amount: number; payment_date: string; razorpay_payment_id?: string; currency?: string },
  studentName: string | undefined,
  courseName: string | undefined,
  seller: InvoiceSeller,
): Promise<Buffer> {
  const total = Number(payment.amount) || 0
  const taxable = Math.round(total / 1.18)
  const gst = total - taxable
  const cgst = Math.round(gst / 2)
  const invoice: InvoiceData = {
    number: `INV-${payment.id?.slice(-6).toUpperCase() ?? 'XXXXXX'}`,
    date: payment.payment_date,
    mode: 'domestic',
    currency: payment.currency || 'INR',
    buyerName: studentName || 'Student',
    lineDescription: courseName || 'AI Certification Program',
    taxable,
    gstRate: 18,
    cgst,
    sgst: gst - cgst,
    total,
    paymentRef: payment.razorpay_payment_id ?? null,
  }
  return renderInvoicePdf(seller, invoice)
}

export async function generateCertificate(certificate: {
  id: string
  user_email: string
  course_name: string
  issued_date: string
}, studentName?: string): Promise<Buffer> {
  const element = React.createElement(CertificatePDF, { certificate, studentName })
  return renderToBuffer(element as PDFElement) as Promise<Buffer>
}
