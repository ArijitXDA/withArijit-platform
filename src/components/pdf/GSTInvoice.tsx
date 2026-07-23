import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#ffffff', color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  company: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  small: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 6, textAlign: 'right' },
  section: { marginBottom: 14 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  label: { fontSize: 8, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 10, color: '#111827', marginBottom: 2 },
  table: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8 },
  tHead: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', paddingVertical: 6, backgroundColor: '#f9fafb' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 6 },
  c1: { flex: 3 },
  c2: { flex: 1, textAlign: 'right' },
  bold: { fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalBox: { borderWidth: 1, borderColor: '#4f46e5', padding: 10, borderRadius: 4, minWidth: 180 },
  totalLabel: { fontSize: 8, color: '#6b7280' },
  totalAmount: { fontSize: 15, fontWeight: 'bold', color: '#4f46e5' },
  note: { marginTop: 16, fontSize: 8, color: '#6b7280' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

export interface InvoiceSeller {
  legalName: string
  gstin: string // may be 'Applied For'
  regOffice: string
  stateName: string
  stateCode: string
  email: string
  sac: string
}

export interface InvoiceData {
  number: string
  date: string
  mode: 'domestic' | 'export'
  currency: string // 'INR' | 'USD' | …
  buyerName: string
  buyerAddress?: string | null
  buyerGstin?: string | null
  buyerCountry?: string | null
  buyerState?: string | null
  lineDescription: string
  taxable: number
  gstRate?: number
  cgst?: number
  sgst?: number
  igst?: number
  total: number
  paymentRef?: string | null
}

export interface GSTInvoiceProps {
  seller: InvoiceSeller
  invoice: InvoiceData
}

// Backwards-compatible legacy shape (older course-invoice callers).
export interface LegacyInvoiceProps {
  payment: { id: string; amount: number; payment_date: string; razorpay_payment_id?: string; currency?: string }
  studentName?: string
  courseName?: string
}

const money = (cur: string, n: number) => {
  const v = Math.round((Number(n) || 0) * 100) / 100
  if (cur === 'INR') return 'Rs.' + Math.round(v).toLocaleString('en-IN')
  const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur + ' '
  return sym + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function GSTInvoice(props: GSTInvoiceProps) {
  const { seller, invoice: inv } = props
  const isExport = inv.mode === 'export'
  const cur = inv.currency || (isExport ? 'USD' : 'INR')
  const hasIgst = (inv.igst ?? 0) > 0
  const hasCgstSgst = (inv.cgst ?? 0) > 0 || (inv.sgst ?? 0) > 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.company}>oStaran</Text>
            <Text style={styles.small}>{seller.legalName}</Text>
            <Text style={styles.small}>{seller.regOffice}</Text>
            <Text style={styles.small}>GSTIN: {seller.gstin || 'Applied For'}</Text>
            <Text style={styles.small}>State: {seller.stateName} ({seller.stateCode})</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{isExport ? 'EXPORT INVOICE' : 'TAX INVOICE'}</Text>
            <Text style={[styles.small, { textAlign: 'right' }]}>Invoice No: {inv.number}</Text>
            <Text style={[styles.small, { textAlign: 'right' }]}>Date: {inv.date}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.label}>Billed to</Text>
            <Text style={styles.value}>{inv.buyerName}</Text>
            {inv.buyerAddress ? <Text style={styles.small}>{inv.buyerAddress}</Text> : null}
            {inv.buyerState ? <Text style={styles.small}>{inv.buyerState}</Text> : null}
            {inv.buyerCountry ? <Text style={styles.small}>{inv.buyerCountry}</Text> : null}
            {inv.buyerGstin ? <Text style={styles.small}>GSTIN: {inv.buyerGstin}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Place of supply</Text>
            <Text style={styles.value}>{isExport ? 'Outside India (export)' : inv.buyerState || 'India'}</Text>
            <Text style={styles.label}>SAC</Text>
            <Text style={styles.value}>{seller.sac}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.c1, styles.bold]}>Description</Text>
            <Text style={[styles.c2, styles.bold]}>Amount ({cur})</Text>
          </View>
          <View style={styles.tRow}>
            <Text style={styles.c1}>{inv.lineDescription}</Text>
            <Text style={styles.c2}>{money(cur, inv.taxable)}</Text>
          </View>
          {hasIgst && (
            <View style={styles.tRow}>
              <Text style={styles.c1}>IGST @ {inv.gstRate}%</Text>
              <Text style={styles.c2}>{money(cur, inv.igst ?? 0)}</Text>
            </View>
          )}
          {hasCgstSgst && (
            <>
              <View style={styles.tRow}>
                <Text style={styles.c1}>CGST @ {(inv.gstRate ?? 18) / 2}%</Text>
                <Text style={styles.c2}>{money(cur, inv.cgst ?? 0)}</Text>
              </View>
              <View style={styles.tRow}>
                <Text style={styles.c1}>SGST @ {(inv.gstRate ?? 18) / 2}%</Text>
                <Text style={styles.c2}>{money(cur, inv.sgst ?? 0)}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.totalRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL {isExport ? 'PAYABLE' : 'AMOUNT PAID'}</Text>
            <Text style={styles.totalAmount}>{money(cur, inv.total)}</Text>
          </View>
        </View>

        {inv.paymentRef ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Payment reference</Text>
            <Text style={styles.value}>{inv.paymentRef}</Text>
          </View>
        ) : null}

        {isExport ? (
          <Text style={styles.note}>
            Supply meant for export of services under LUT — zero-rated, no GST charged (IGST Act s.16, CGST Act s.16 r/w Rule 96A).
          </Text>
        ) : (
          <Text style={styles.note}>Amount is inclusive of GST as shown above. This is a computer-generated tax invoice.</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {seller.legalName} · {seller.email} · This is a computer-generated invoice and needs no signature.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
