import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legalInfo'

export const metadata: Metadata = {
  title: 'AI Partner Agreement | oStaran',
  description: `Terms governing participation in the oStaran AI Partner (affiliate) programme, operated by ${LEGAL.entityName}.`,
}

export default function PartnerAgreementPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">AI Partner Agreement</h1>
      <p className="text-gray-500 mb-6">Version 1.0 &nbsp;|&nbsp; Last updated: 30 June 2026</p>
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 mb-8">
        This Agreement governs your participation as an oStaran AI Partner and <strong>supplements</strong> our{' '}
        <a href="/terms" className="underline">Terms &amp; Conditions</a> and <a href="/privacy" className="underline">Privacy Policy</a>. By registering as a Partner you accept it.
      </div>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Relationship</h2>
          <p>The AI Partner programme is operated by <strong>{LEGAL.entityName}</strong> ({LEGAL.registeredOffice}). As a Partner you are an <strong>independent contractor</strong> promoting our courses. You are not an employee, agent or legal representative of {LEGAL.entityName}, and you have no authority to bind it, make commitments on its behalf, or collect payments from learners directly.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Commissions &amp; Payouts</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You earn commission on paid enrolments correctly attributed to your partner code / referral link, at the rates published in your dashboard, including any multi-level (sub-partner) rates that apply.</li>
            <li>Commission accrues only on <strong>successful, non-refunded</strong> enrolments. If an enrolment is refunded, charged back, or cancelled, the related commission is reversed (clawed back) from current or future payouts.</li>
            <li>Payouts are made periodically (typically monthly) subject to a minimum threshold and to you having provided valid PAN and bank details. <strong>Tax deducted at source (TDS)</strong> under Section 194H (or as applicable) will be withheld, and you are responsible for your own income tax and, if registered, GST.</li>
            <li>{LEGAL.entityName} is the merchant of record for all course sales and issues the learner's invoice.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. No Income Guarantee</h2>
          <p>Any earnings figures shown anywhere on the platform are <strong>illustrative examples only</strong> and are not a promise or guarantee of income. Your actual earnings depend entirely on your own effort, sales and network.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Conduct &amp; Anti-Spam</h2>
          <p>You agree to promote ethically and lawfully. In particular you will:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Send marketing messages (WhatsApp, SMS, email, calls) <strong>only to people who have consented</strong>, and comply with TRAI/DND regulations and WhatsApp/Meta and email policies. Cold, unsolicited or bulk spam is prohibited and may get your own number/account banned.</li>
            <li>Not make false, misleading or exaggerated claims about the courses, outcomes, certifications, or earnings.</li>
            <li>Use only official, approved marketing materials and not alter our branding or claims.</li>
            <li>Handle any prospective learner's personal data lawfully and never misuse or resell it.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Intellectual Property</h2>
          <p>You receive a limited, non-exclusive, revocable licence to use our approved names, logos and marketing materials solely to promote oStaran courses. All intellectual property remains owned by {LEGAL.entityName} or its licensors. You obtain no other rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Protection</h2>
          <p>We process your personal data (including PAN, address and payout details) to operate the programme, make payouts and meet tax obligations, as described in our <a href="/privacy" className="underline text-indigo-600">Privacy Policy</a>. You are a separate controller for any prospect data you collect yourself and must have your own lawful basis for it.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Term, Suspension &amp; Termination</h2>
          <p>Either party may end this arrangement at any time on notice. {LEGAL.entityName} may suspend or terminate your account immediately for breach of this Agreement, unlawful conduct, spam, or misrepresentation. On termination, validly-accrued, unpaid and un-clawed-back commission for genuine enrolments will be settled at the next payout cycle; unearned or reversed amounts will not be paid.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Liability &amp; Governing Law</h2>
          <p>To the extent permitted by law, {LEGAL.entityName}'s total liability to you under this Agreement is limited to the commission validly payable to you. This Agreement is governed by the laws of India and subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes &amp; Contact</h2>
          <p>We may update this Agreement; material changes will be notified and continued participation constitutes acceptance. Questions: <a href={`mailto:${LEGAL.grievanceEmail}`} className="underline text-indigo-600">{LEGAL.grievanceEmail}</a> · {LEGAL.entityName}, {LEGAL.registeredOffice}.</p>
        </section>
      </div>
    </div>
  )
}
