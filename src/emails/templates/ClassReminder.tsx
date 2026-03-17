import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'
import * as React from 'react'

interface ClassReminderProps {
  name: string
  session_title: string
  session_date: string
  session_time: string
  join_url: string
}

export function ClassReminder({ name, session_title, session_date, session_time, join_url }: ClassReminderProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ color: '#111827', fontSize: '24px' }}>Your class is tomorrow! 📚</Heading>
          <Text style={{ color: '#374151' }}>Hi {name},</Text>
          <Text style={{ color: '#374151' }}>
            Don&apos;t forget: <strong>{session_title}</strong> is on <strong>{session_date}</strong> at <strong>{session_time}</strong>.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={join_url} style={{ background: '#4f46e5', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold' }}>
              Join Class →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>withArijit — AI Education Platform</Text>
        </Container>
      </Body>
    </Html>
  )
}
