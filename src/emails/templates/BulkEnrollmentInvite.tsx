import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'
import * as React from 'react'

interface BulkEnrollmentInviteProps {
  name: string
  course_id: string
  signup_url: string
}

export function BulkEnrollmentInvite({ name, course_id, signup_url }: BulkEnrollmentInviteProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ color: '#111827', fontSize: '24px' }}>You&apos;ve been enrolled! 🚀</Heading>
          <Text style={{ color: '#374151' }}>Hi {name},</Text>
          <Text style={{ color: '#374151' }}>
            Your organisation has enrolled you in <strong>{course_id}</strong>.
            Create your account to access your course materials and live sessions.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={signup_url} style={{ background: '#4f46e5', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold' }}>
              Activate Your Account →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>withArijit — AI Education Platform</Text>
        </Container>
      </Body>
    </Html>
  )
}
