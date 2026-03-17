import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    padding: 60,
    flexDirection: 'column',
    alignItems: 'center',
  },
  border: {
    borderWidth: 3,
    borderColor: '#4f46e5',
    padding: 40,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
  },
  brand: { fontSize: 14, color: '#4f46e5', letterSpacing: 3, marginBottom: 8, fontWeight: 'bold' },
  certTitle: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  recipientLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 4 },
  recipientName: { fontSize: 24, fontWeight: 'bold', color: '#4f46e5', marginBottom: 4 },
  courseLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 4, marginTop: 8 },
  courseName: { fontSize: 16, color: '#111827', fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  dateText: { fontSize: 10, color: '#6b7280', marginTop: 24 },
  sigBlock: { marginTop: 32, flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  sigLine: { borderTopWidth: 1, borderTopColor: '#111827', width: 160, textAlign: 'center' },
  sigLabel: { fontSize: 9, color: '#6b7280', marginTop: 4 },
})

interface CertificatePDFProps {
  certificate: {
    id: string
    user_email: string
    course_name: string
    issued_date: string
  }
  studentName?: string
}

export function CertificatePDF({ certificate, studentName = 'Student' }: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.brand}>WITHARIJIT</Text>
          <Text style={styles.certTitle}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>This is to certify that</Text>
          <Text style={styles.recipientName}>{studentName}</Text>
          <Text style={styles.courseLabel}>has successfully completed</Text>
          <Text style={styles.courseName}>{certificate.course_name}</Text>
          <Text style={styles.dateText}>Issued on {certificate.issued_date}</Text>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine}>
              <Text style={styles.sigLabel}>Arijit</Text>
              <Text style={styles.sigLabel}>Founder, withArijit</Text>
            </View>
            <View style={styles.sigLine}>
              <Text style={styles.sigLabel}>oStaran Edu Pvt Ltd</Text>
              <Text style={styles.sigLabel}>AI Education Platform</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
