import type { Metadata } from 'next'
import { Navbar } from '@/components/shared/Navbar'
import { Footer } from '@/components/shared/Footer'
import { VisitorChatWidget } from '@/components/shared/VisitorChatWidget'
import { CurrencyProvider } from '@/lib/currency'
import { getFxRates } from '@/lib/fxRates'

export const metadata: Metadata = {
  title: {
    template: '%s | oStaran',
    default: 'oStaran — AI Education Platform',
  },
  description: 'India\'s premier AI education platform. Enterprise-grade AI certification programmes for professionals, students, entrepreneurs & leaders.',
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const rates = await getFxRates()
  return (
    <CurrencyProvider rates={rates}>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <VisitorChatWidget />
    </CurrencyProvider>
  )
}
