import { renderToBuffer, DocumentProps } from '@react-pdf/renderer'
import React, { JSXElementConstructor, ReactElement } from 'react'
import { GSTInvoice } from '@/components/pdf/GSTInvoice'
import { CertificatePDF } from '@/components/pdf/CertificatePDF'

type PDFElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

export async function generateGSTInvoice(payment: {
  id: string
  amount: number
  payment_date: string
  razorpay_payment_id?: string
  currency?: string
}, studentName?: string, courseName?: string): Promise<Buffer> {
  const element = React.createElement(GSTInvoice, { payment, studentName, courseName })
  return renderToBuffer(element as PDFElement) as Promise<Buffer>
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
