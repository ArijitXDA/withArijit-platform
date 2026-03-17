import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'
import * as React from 'react'

interface GiftEnrollmentProps {
  payer_name: string
  course_id: string
  signup_url: string
}

export function GiftEnrollment({ payer_name, course_id, signup_url }: GiftEnrollmentProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ color: '#111827', fontSize: '24px' }}>You&apos;ve received an AI course! 🎁</Heading>
          <Text style={{ color: '#374151' }}>
            <strong>{payer_name}</strong> has gifted you access to <strong>{course_id}</strong>.
          </Text>
          <Text style={{ color: '#374151' }}>
            Create your account to claim your course and start learning.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={signup_url} style={{ background: '#4f46e5', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold' }}>
              Claim Your Course →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>withArijit — AI Education Platform</Text>
        </Container>
      </Body>
    </Html>
  )
}
