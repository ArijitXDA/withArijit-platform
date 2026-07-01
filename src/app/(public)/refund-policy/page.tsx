import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | withArijit',
  description: 'Refund and cancellation policy for courses purchased on withArijit — operated by Star Analytix Pvt Ltd.',
}

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Cancellation &amp; Refund Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: 1 March 2025 &nbsp;|&nbsp; Effective from: 1 January 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
          <p>At withArijit (operated by <strong>Star Analytix Pvt Ltd</strong>), we are committed to your satisfaction. We offer a straightforward refund policy for our AI certification courses and programs. All refund requests are handled fairly and promptly.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Full Refund — Within 7 Days</h2>
          <p>You are eligible for a <strong>full refund</strong> if you submit your refund request within <strong>7 calendar days</strong> of the date of purchase, provided that:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>You have not attended more than 2 live sessions of the course</li>
            <li>You have not accessed or downloaded more than 20% of the course materials</li>
            <li>Your certificate has not been issued</li>
          </ul>
          <p className="mt-2">No questions asked within this window, subject to the above conditions.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Partial Refund — 7 to 30 Days</h2>
          <p>If you request a refund between <strong>7 and 30 days</strong> of purchase, a partial refund may be considered at our discretion based on:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Number of sessions attended</li>
            <li>Percentage of course content accessed</li>
            <li>Reason for cancellation</li>
          </ul>
          <p className="mt-2">Partial refunds in this window are typically 50% of the amount paid.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. No Refund After 30 Days</h2>
          <p>Refund requests made more than 30 days after the date of purchase are not eligible for a refund under any circumstances, as significant course access and resources have been utilised.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Non-Refundable Situations</h2>
          <p>Refunds will <strong>not</strong> be issued in the following cases:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Certificate has been issued and downloaded</li>
            <li>More than 30 days have elapsed since purchase</li>
            <li>Enrolment was obtained using a special promotional discount exceeding 50% off</li>
            <li>Student has been removed from the platform for a violation of our Terms of Service</li>
            <li>Courses purchased during special flash sales marked as "non-refundable"</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Payment Failure Refunds</h2>
          <p>If your payment is deducted but the enrolment is not confirmed (due to a technical error), you are entitled to a <strong>full refund</strong> with no conditions. Such refunds are processed within <strong>5–7 business days</strong> automatically. If not resolved within 7 business days, please contact us with your payment transaction ID.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. How to Request a Refund</h2>
          <p>To request a refund, please:</p>
          <ol className="list-decimal pl-6 mt-2 space-y-1">
            <li>Email us at <a href="mailto:ai@ostaran.com" className="text-indigo-600 hover:underline">ai@ostaran.com</a></li>
            <li>Use the subject line: <strong>"Refund Request — [Your Name] — [Order ID]"</strong></li>
            <li>Include your registered email address, the course name, Razorpay payment ID, and reason for refund</li>
          </ol>
          <p className="mt-2">We will acknowledge your request within 2 business days and process approved refunds within <strong>5–7 business days</strong>. Refunds are credited to the original payment method (bank account, card, UPI, or wallet).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cancellation by withArijit</h2>
          <p>In the rare event that a course is cancelled by us (e.g., instructor unavailability, force majeure), enrolled students will receive a <strong>full refund</strong> or the option to transfer to the next available batch at no additional cost.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact for Refund Queries</h2>
          <div className="space-y-1">
            <p><strong>Star Analytix Pvt Ltd</strong></p>
            <p>Email: <a href="mailto:ai@ostaran.com" className="text-indigo-600 hover:underline">ai@ostaran.com</a></p>
            <p>Grievance Officer: <a href="mailto:grievance@ostaran.com" className="text-indigo-600 hover:underline">grievance@ostaran.com</a></p>
            <p>Response time: Within 2 business days</p>
            <p>Address: Mira Road East, Mumbai, Maharashtra, India — 401107</p>
          </div>
        </section>

      </div>
    </div>
  )
}
