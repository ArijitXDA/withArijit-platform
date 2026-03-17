import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'
import * as React from 'react'

interface PaymentFailureProps {
  name: string
  amount: number
  retry_url: string
}

export function PaymentFailure({ name, amount, retry_url }: PaymentFailureProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ color: '#dc2626', fontSize: '24px' }}>Payment Failed ⚠️</Heading>
          <Text style={{ color: '#374151' }}>Hi {name},</Text>
          <Text style={{ color: '#374151' }}>
            Your payment of ₹{amount.toLocaleString('en-IN')} could not be processed. Please try again.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={retry_url} style={{ background: '#dc2626', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold' }}>
              Retry Payment →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>withArijit — AI Education Platform</Text>
        </Container>
      </Body>
    </Html>
  )
}
