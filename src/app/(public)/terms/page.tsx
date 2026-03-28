import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions | withArijit',
  description: 'Terms and Conditions for using the withArijit AI Education Platform operated by oStaran Edu Pvt Ltd.',
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Terms &amp; Conditions</h1>
      <p className="text-gray-500 mb-10">Last updated: 1 March 2025 &nbsp;|&nbsp; Effective from: 1 January 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. About Us</h2>
          <p>withArijit is an AI education platform operated by <strong>oStaran Edu Pvt Ltd</strong>, incorporated in India. The Platform provides live online AI certification courses, webinars, and learning resources at <strong>www.ostaran.com</strong> and <strong>www.witharijit.com</strong>.</p>
          <p className="mt-2">By accessing or using our Platform, creating an account, or enrolling in any course, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use our Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility</h2>
          <p>You must be at least 18 years of age to enrol in our paid courses. By registering, you confirm that you are legally capable of entering into a binding agreement under Indian law. Corporate enrolments require authorisation from an appropriate representative of the organisation.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Course Enrolment and Access</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Upon successful payment, you will receive access to the enrolled course materials, live sessions, and recordings via your student dashboard.</li>
            <li>Course access is personal and non-transferable. You may not share your login credentials or course materials with any third party.</li>
            <li>Live session schedules are provided in advance. Recordings are made available within 24–48 hours of each session.</li>
            <li>We reserve the right to modify session schedules with reasonable prior notice.</li>
            <li>Lifetime access to recordings applies to the specific course batch enrolled in. Future batch recordings are not included unless separately enrolled.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Pricing and Payment</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>All prices displayed are in Indian Rupees (INR) and are inclusive of applicable GST (18%).</li>
            <li>Payments are processed securely via Razorpay. We accept UPI, credit/debit cards, net banking, and EMI options.</li>
            <li>A GST invoice will be issued electronically to your registered email address within 24 hours of successful payment.</li>
            <li>In the event of a payment failure, no amount will be debited. If debited erroneously, refunds are processed within 5–7 business days.</li>
            <li>Course fees are subject to revision. The fee applicable at the time of your enrolment is the fee you pay — we do not retrospectively charge for price increases.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Intellectual Property</h2>
          <p>All course content, videos, study materials, slide decks, and platform features are the intellectual property of oStaran Edu Pvt Ltd or its licensors. You are granted a limited, non-exclusive, non-transferable licence to access course content for personal educational use only. You may not:</p>
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
          <p>AI Certification is issued upon completion of the course curriculum and any required assessments. Certificates are issued in digital form. oStaran Edu Pvt Ltd retains the right to revoke certificates in cases of academic dishonesty. Certificates attest to course completion and the skills covered — they do not constitute a degree or government-recognised qualification.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
          <p>The Platform and course content are provided on an "as available" basis. oStaran Edu Pvt Ltd is not liable for: technical outages beyond our control, outcomes such as job placement or salary increases (though we strive to support these), loss of data due to events outside our control, or indirect/consequential damages. Our maximum liability in any dispute is limited to the course fee paid by you.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Governing Law and Dispute Resolution</h2>
          <p>These Terms are governed by the laws of India. Any disputes arising from these Terms shall first be attempted to be resolved through mutual negotiation. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra, India.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Modifications</h2>
          <p>We reserve the right to update these Terms at any time. Material changes will be communicated via email or a notice on the Platform. Continued use after notification of changes constitutes acceptance of the revised Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
          <div className="space-y-1">
            <p><strong>oStaran Edu Pvt Ltd</strong></p>
            <p>Email: <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a></p>
            <p>Address: Mumbai, Maharashtra, India</p>
          </div>
        </section>

      </div>
    </div>
  )
}
