import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legalInfo'

export const metadata: Metadata = {
  title: 'Mentor Agreement | oStaran',
  description: `Terms governing participation as a Mentor (course instructor) on oStaran, operated by ${LEGAL.entityName}.`,
}

export default function MentorAgreementPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Mentor Agreement</h1>
      <p className="text-gray-500 mb-6">Version 1.0 &nbsp;|&nbsp; Last updated: 30 June 2026</p>
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 mb-8">
        This Agreement governs your participation as an oStaran Mentor (course instructor) and <strong>supplements</strong> our{' '}
        <a href="/terms" className="underline">Terms &amp; Conditions</a> and <a href="/privacy" className="underline">Privacy Policy</a>. By applying as a Mentor you accept it.
      </div>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Relationship</h2>
          <p>The Mentor programme is operated by <strong>{LEGAL.entityName}</strong> ({LEGAL.registeredOffice}). As a Mentor you are an <strong>independent instructor</strong>, not an employee or agent. {LEGAL.entityName} is the <strong>merchant of record</strong> for your course sales, issues learner invoices, and provides the delivery, payments and support platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Revenue Share &amp; Payouts</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You earn a <strong>net revenue share</strong> on paid enrolments in your course. The default share is <strong>50% to the Mentor</strong>, and may be individually negotiated up to a maximum of <strong>90%</strong> for a specific course via an approved revenue-share request — the rate that applies is shown on your course.</li>
            <li>"Net revenue" means the amount received for an enrolment <strong>after</strong> GST, payment-gateway and refund/chargeback costs, and any partner/affiliate commission paid on that enrolment.</li>
            <li>The share is snapshotted per enrolment, so a later rate change is never applied retroactively.</li>
            <li>Payouts are made periodically (typically monthly) subject to a minimum threshold, with <strong>TDS</strong> (Section 194J, or as applicable) withheld. If you are GST-registered you will raise a GST invoice on {LEGAL.entityName} for your share. You are responsible for your own taxes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Content, Recording &amp; Licence</h2>
          <p>You retain ownership of the teaching content you create. You grant {LEGAL.entityName} a <strong>worldwide, royalty-free, sub-licensable licence</strong> to host, deliver, record, transcribe, reproduce, adapt for learning aids, and re-share your course content, live sessions, recordings and transcripts through the oStaran platform and library. This licence <strong>survives termination</strong> to the extent needed to continue serving learners already enrolled in your course.</p>
          <p className="mt-2">You confirm your live sessions and webinars are <strong>recorded and transcribed</strong> on Microsoft Teams and consent to this, and you consent to the public display of your name, photograph, biography and credentials as the course trainer.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Co-Mentors (Joint Mentoring)</h2>
          <p>As a lead Mentor you may invite co-mentors to co-teach your course, subject to oStaran approval. <strong>oStaran pays the payout only to the lead Mentor</strong>; any compensation to a co-mentor is a private arrangement between you and them, for which oStaran is not responsible. A co-mentor's public profile is displayed on the course page. Only the lead may change the revenue share, remove a co-mentor, or invite others.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Standards &amp; Conduct</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Deliver your sessions professionally and as scheduled; you must have a profile photo and genuine credentials before launching a course.</li>
            <li>Do not make false or misleading claims about outcomes, certification, or your qualifications.</li>
            <li>Market only to consenting recipients and comply with TRAI/DND, WhatsApp/Meta and email policies (no spam).</li>
            <li>Certificates are co-branded and issued through oStaran on course completion.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Term, Termination &amp; Takedown</h2>
          <p>Either party may end this arrangement on notice. {LEGAL.entityName} may suspend or remove a course for breach, quality issues, or unlawful conduct. On termination, validly-accrued unpaid revenue share is settled at the next payout cycle, and enrolled learners retain access to what they paid for (per the surviving licence in Section 3).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Liability &amp; Governing Law</h2>
          <p>To the extent permitted by law, {LEGAL.entityName}'s total liability to you is limited to the revenue share validly payable to you. This Agreement is governed by the laws of India and subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Changes &amp; Contact</h2>
          <p>We may update this Agreement; material changes will be notified and continued participation constitutes acceptance. Questions: <a href={`mailto:${LEGAL.grievanceEmail}`} className="underline text-indigo-600">{LEGAL.grievanceEmail}</a> · {LEGAL.entityName}, {LEGAL.registeredOffice}.</p>
        </section>
      </div>
    </div>
  )
}
