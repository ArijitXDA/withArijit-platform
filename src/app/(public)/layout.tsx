import type { Metadata } from 'next'
import { Navbar } from '@/components/shared/Navbar'
import { Footer } from '@/components/shared/Footer'
import { VisitorChatWidget } from '@/components/shared/VisitorChatWidget'

export const metadata: Metadata = {
  title: {
    template: '%s | oStaran',
    default: 'oStaran — AI Education Platform',
  },
  description: 'India\'s premier AI education platform. Enterprise-grade AI certification programmes for professionals, students, entrepreneurs & leaders.',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <VisitorChatWidget />
    </>
  )
}
