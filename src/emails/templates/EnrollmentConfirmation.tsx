import {
  Html, Head, Body, Container, Heading, Text, Button, Hr, Section
} from '@react-email/components'
import * as React from 'react'

interface EnrollmentConfirmationProps {
  name: string
  course_name: string
  amount: number
  dashboard_url: string
}

export function EnrollmentConfirmation({ name, course_name, amount, dashboard_url }: EnrollmentConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ color: '#111827', fontSize: '24px', marginBottom: '16px' }}>
            You&apos;re enrolled! 🎉
          </Heading>
          <Text style={{ color: '#374151', fontSize: '16px' }}>Hi {name},</Text>
          <Text style={{ color: '#374151', fontSize: '16px' }}>
            Welcome to <strong>{course_name}</strong>. Your payment of ₹{amount.toLocaleString('en-IN')} has been confirmed.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={dashboard_url}
              style={{ background: '#4f46e5', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Go to Dashboard →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            withArijit — AI Education Platform | oStaran Edu Pvt Ltd
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
