import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { UnsubscribeForm } from './_components/UnsubscribeForm'
import { MailX, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Manage your oStaran lifecycle email and WhatsApp preferences.',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 2) return `${local[0] || ''}•••@${domain}`
  return `${local.slice(0, 2)}•••${local.slice(-1)}@${domain}`
}

interface PageProps {
  params: Promise<{ enrolment_id: string }>
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { enrolment_id } = await params

  // Validate UUID shape before any DB query (cheap, blocks brute-force noise)
  const isValidUuid = UUID_RE.test(enrolment_id)

  let email: string | null = null
  let mobile: string | null = null
  let sequenceLabel: string | null = null
  let alreadySuppressed = false

  if (isValidUuid) {
    const supabase = createServiceClient()

    // Look up the enrolment WITHOUT filtering on status — let users unsub even from
    // already-completed/exited enrolments (idempotent UX)
    const { data: enrolment } = await supabase
      .from('lifecycle_sequence_enrolments')
      .select('email, mobile, sequence_id')
      .eq('id', enrolment_id)
      .maybeSingle()

    if (enrolment?.email) {
      // Capture into const so TS preserves narrowing across awaits below
      const enrolmentEmail: string = enrolment.email
      email = enrolmentEmail
      mobile = enrolment.mobile ?? null

      // Get a friendly sequence label
      const { data: seq } = await supabase
        .from('lifecycle_sequences')
        .select('description, sequence_key')
        .eq('id', enrolment.sequence_id)
        .maybeSingle()
      sequenceLabel = seq?.description || seq?.sequence_key || null

      // Check if this email is already fully suppressed
      const { data: existingSuppression } = await supabase
        .from('lifecycle_suppression')
        .select('channels')
        .eq('email', enrolmentEmail.toLowerCase())
        .maybeSingle()
      if (existingSuppression && Array.isArray(existingSuppression.channels)
          && existingSuppression.channels.includes('email')) {
        alreadySuppressed = true
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 py-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-10">

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
            <MailX size={26} className="text-indigo-600" />
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Unsubscribe from oStaran
          </h1>

          {!email ? (
            // Generic state: invalid/missing enrolment - show success-style UX without leaking validity
            <>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-6">
                If your email was on our list, you&apos;ve now been removed.
                We&apos;re sorry to see you go.
              </p>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Your unsubscribe link looked invalid or has expired.
                    If you keep receiving emails after 24 hours, please reply to any
                    oStaran email and our team will remove you manually.
                  </p>
                </div>
              </div>
              <a href="https://www.ostaran.com" className="inline-block text-sm text-indigo-600 hover:underline font-medium">
                ← Back to oStaran
              </a>
            </>
          ) : alreadySuppressed ? (
            // Idempotent state: already unsubscribed
            <>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-2">
                You&apos;re already unsubscribed.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                <strong className="text-gray-900">{maskEmail(email)}</strong> has been removed
                from oStaran lifecycle emails. You will not receive any further communication.
              </p>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-6">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Transactional emails (payment receipts, course access for purchases you&apos;ve made,
                  refund confirmations) are not affected — these are required for our service relationship.
                </p>
              </div>
              <a href="https://www.ostaran.com" className="inline-block text-sm text-indigo-600 hover:underline font-medium">
                ← Back to oStaran
              </a>
            </>
          ) : (
            // Active state: confirm unsubscribe
            <UnsubscribeForm
              enrolmentId={enrolment_id}
              maskedEmail={maskEmail(email)}
              hasMobile={!!mobile}
              sequenceLabel={sequenceLabel}
            />
          )}
        </div>

        {/* Privacy footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Star Analytix Pvt Ltd · DPDP-compliant unsubscribe under §11 ·{' '}
          <a href="/privacy" className="hover:text-gray-600 underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
