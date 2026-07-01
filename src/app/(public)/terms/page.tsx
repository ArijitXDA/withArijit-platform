import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legalInfo'

export const metadata: Metadata = {
  title: 'Terms & Conditions | oStaran',
  description: `Terms and Conditions for the oStaran / withArijit AI education platform, operated by ${LEGAL.entityName}.`,
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Terms &amp; Conditions</h1>
      <p className="text-gray-500 mb-10">Last updated: 30 June 2026 &nbsp;|&nbsp; Effective from: 1 January 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. About Us</h2>
          <p>{LEGAL.brandsLong} is an AI education platform operated by <strong>{LEGAL.entityName}</strong>, incorporated in India. The Platform provides live online AI certification courses, webinars, and learning resources at {LEGAL.domains}.</p>
          <p className="mt-2">By accessing or using our Platform, creating an account, or enrolling in any course, you agree to be bound by these Terms &amp; Conditions and our <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a> and <a href="/refund-policy" className="text-indigo-600 hover:underline">Cancellation &amp; Refund Policy</a>. If you do not agree, please do not use our Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility, Minors &amp; Guardians</h2>
          <p>If you are <strong>18 years or older</strong>, you may enrol in our courses in your own name, and you confirm that you are legally capable of entering into a binding agreement under Indian law.</p>
          <p className="mt-2">Some of our programmes are designed for <strong>school students and children under 18</strong>. A person under 18 may not create an account or purchase a course on their own. For any learner under 18, the account must be created and the course purchased by a <strong>parent or legal guardian</strong>, who: (a) enters into these Terms and the contract on the child's behalf and is the account holder and paying party; (b) provides verifiable parental consent for us to process the child's data as described in our Privacy Policy; and (c) is responsible for supervising the child's use of the Platform. By enrolling a minor, you confirm you are their parent or legal guardian.</p>
          <p className="mt-2">Corporate and group enrolments require authorisation from an appropriate representative of the organisation, who confirms they are authorised to purchase and to provide the enrolled participants' details.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Course Enrolment, Access &amp; Recordings</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Upon successful payment, you will receive access to the enrolled course materials, live sessions, and recordings via your dashboard.</li>
            <li>Course access is personal and non-transferable. You may not share your login credentials or course materials with any third party.</li>
            <li><strong>Live sessions and webinars are recorded and transcribed via Microsoft Teams.</strong> Recordings and transcripts may capture your name, voice, image and chat, are shared with enrolled learners, and are used to generate learning materials. By joining a live session you consent to this, as described in our <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>.</li>
            <li>Live session schedules are provided in advance; recordings are typically available within 24–48 hours.</li>
            <li>Lifetime access to recordings applies to the specific course batch enrolled in. Future batch recordings are not included unless separately enrolled.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Pricing and Payment</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>All prices displayed are in Indian Rupees (INR) and are inclusive of applicable GST (18%). The tax break-up is shown before you pay and on your invoice.</li>
            <li>Payments are processed securely via Razorpay. We accept UPI, credit/debit cards, net banking, and EMI options. Where a course offers an instalment ("pay part now") option, the balance amount and its due date are shown at checkout and on your dashboard.</li>
            <li>A GST invoice is issued electronically to your registered email within 24 hours of successful payment.</li>
            <li>In the event of a payment failure, no amount will be debited. If debited erroneously, refunds are processed within 5–7 business days.</li>
            <li>The fee applicable at the time of your enrolment is the fee you pay — we do not retrospectively charge for price increases.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Intellectual Property</h2>
          <p>All course content, videos, study materials, slide decks, and platform features are the intellectual property of {LEGAL.entityName} or its licensors. You are granted a limited, non-exclusive, non-transferable licence to access course content for personal educational use only. You may not:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Record, redistribute, resell, or publicly display any course content</li>
            <li>Use course materials for commercial purposes</li>
            <li>Remove or alter any copyright or trademark notices</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Code of Conduct</h2>
          <p>Students are expected to maintain respectful conduct in all live sessions and community spaces. We reserve the right to remove any student from the platform without refund for: harassment of instructors or other students, sharing copyrighted materials, cheating on assessments, or any other conduct that disrupts the learning environment.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Certificates</h2>
          <p>AI Certification is issued upon completion of the course curriculum and any required assessments, in digital form. {LEGAL.entityName} retains the right to revoke certificates in cases of academic dishonesty. Certificates attest to course completion and the skills covered — they do not constitute a degree or government-recognised qualification.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Partners &amp; Mentors</h2>
          <p>If you join as an AI Partner or as a Mentor, additional terms apply to that relationship (commission / revenue-share, conduct, tax and payout terms), which are presented to you when you apply. Nothing on the Platform is a guarantee of income; illustrative earnings figures are examples only and depend on your own effort and results.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
          <p>The Platform and course content are provided on an "as available" basis. {LEGAL.entityName} is not liable for: technical outages beyond our control, outcomes such as job placement or salary increases (though we strive to support these), loss of data due to events outside our control, or indirect/consequential damages. Our maximum liability in any dispute is limited to the course fee paid by you.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Governing Law and Dispute Resolution</h2>
          <p>These Terms are governed by the laws of India. Any disputes shall first be attempted to be resolved through mutual negotiation and our grievance process (Section 12). If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra, India.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Modifications</h2>
          <p>We reserve the right to update these Terms at any time. Material changes will be communicated via email or a notice on the Platform. Continued use after notification of changes constitutes acceptance of the revised Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Grievance Officer &amp; Contact</h2>
          <div className="space-y-1 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p><strong>{LEGAL.entityName}</strong> {(LEGAL.cin || LEGAL.gstin) && <span className="text-gray-500 text-sm">({[LEGAL.cin && `CIN ${LEGAL.cin}`, LEGAL.gstin && `GSTIN ${LEGAL.gstin}`].filter(Boolean).join(' · ')})</span>}</p>
            <p>Grievance Officer{LEGAL.grievanceOfficerName ? `: ${LEGAL.grievanceOfficerName}` : ''}</p>
            <p>Email: <a href={`mailto:${LEGAL.grievanceEmail}`} className="text-indigo-600 hover:underline">{LEGAL.grievanceEmail}</a></p>
            {LEGAL.grievancePhone && <p>Phone: {LEGAL.grievancePhone}</p>}
            <p>Address: {LEGAL.registeredOffice}</p>
          </div>
        </section>

      </div>
    </div>
  )
}
