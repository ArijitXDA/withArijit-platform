import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  company: { fontSize: 18, fontWeight: 'bold', color: '#4f46e5' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 10, color: '#6b7280', marginBottom: 4 },
  section: { marginBottom: 16 },
  label: { fontSize: 9, color: '#9ca3af', marginBottom: 2 },
  value: { fontSize: 11, color: '#111827', marginBottom: 8 },
  table: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', paddingVertical: 8, backgroundColor: '#f9fafb' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  total: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalBox: { borderWidth: 1, borderColor: '#4f46e5', padding: 12, borderRadius: 4 },
  totalLabel: { fontSize: 9, color: '#6b7280' },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

interface GSTInvoiceProps {
  payment: {
    id: string
    amount: number
    payment_date: string
    razorpay_payment_id?: string
    currency?: string
  }
  studentName?: string
  courseName?: string
}

export function GSTInvoice({ payment, studentName = 'Student', courseName = 'AI Certification Program' }: GSTInvoiceProps) {
  const baseAmount = Math.round(payment.amount / 1.18)
  const gstAmount = payment.amount - baseAmount
  const invoiceNo = `INV-${payment.id?.slice(-6).toUpperCase() ?? 'XXXXXX'}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>withArijit</Text>
            <Text style={styles.subtitle}>oStaran Edu Pvt Ltd</Text>
            <Text style={styles.subtitle}>Mumbai, Maharashtra, India</Text>
            <Text style={styles.subtitle}>GSTIN: 27AAAAA0000A1Z5</Text>
          </View>
          <View>
            <Text style={styles.title}>TAX INVOICE</Text>
            <Text style={styles.subtitle}>Invoice No: {invoiceNo}</Text>
            <Text style={styles.subtitle}>Date: {payment.payment_date}</Text>
          </View>
        </View>

        {/* Billed to */}
        <View style={styles.section}>
          <Text style={styles.label}>BILLED TO</Text>
          <Text style={styles.value}>{studentName}</Text>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { fontWeight: 'bold' }]}>Description</Text>
            <Text style={[styles.col2, { fontWeight: 'bold' }]}>Amount (INR)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>{courseName}</Text>
            <Text style={styles.col2}>Rs.{baseAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>GST @ 18% (SAC: 999293)</Text>
            <Text style={styles.col2}>Rs.{gstAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.total}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL AMOUNT PAID</Text>
            <Text style={styles.totalAmount}>Rs.{payment.amount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Payment reference */}
        {payment.razorpay_payment_id && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>PAYMENT REFERENCE</Text>
            <Text style={styles.value}>{payment.razorpay_payment_id}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            withArijit | oStaran Edu Pvt Ltd | ai@withArijit.com | This is a computer-generated invoice.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
