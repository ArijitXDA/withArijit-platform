import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | withArijit',
  description: 'Shipping and delivery policy for withArijit — a digital-only platform operated by oStaran Edu Pvt Ltd.',
}

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Shipping &amp; Delivery Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: 1 March 2025 &nbsp;|&nbsp; Effective from: 1 January 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Digital Products Only</h2>
          <p>withArijit (operated by <strong>oStaran Edu Pvt Ltd</strong>) is a <strong>100% digital platform</strong>. We do not sell or ship any physical products. All our offerings — including AI certification courses, masterclasses, webinars, study materials, and certificates — are delivered digitally.</p>
          <p className="mt-2">There are no shipping charges applicable to any of our products or services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Digital Delivery — What You Receive</h2>
          <p>Upon successful payment confirmation, you will receive the following digitally:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>
              <strong>Course Access:</strong> Immediate access to your student dashboard at <a href="https://www.ostaran.com/dashboard" className="text-indigo-600 hover:underline">www.ostaran.com/dashboard</a>. You will receive a welcome email with login instructions within <strong>30 minutes</strong> of payment confirmation.
            </li>
            <li>
              <strong>Live Session Links:</strong> Microsoft Teams or Zoom session links for all upcoming live classes, sent via email and WhatsApp before each session.
            </li>
            <li>
              <strong>Session Recordings:</strong> Made available in your dashboard within <strong>24–48 hours</strong> after each live session.
            </li>
            <li>
              <strong>Study Materials:</strong> PDFs, slide decks, and project files delivered through your student dashboard.
            </li>
            <li>
              <strong>GST Invoice:</strong> A tax invoice sent to your registered email address within <strong>24 hours</strong> of payment.
            </li>
            <li>
              <strong>AI Certification:</strong> Issued digitally upon course completion, downloadable from your dashboard and shareable on LinkedIn.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Delivery Timeline Summary</h2>
          <div className="overflow-x-auto mt-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 border border-gray-200 font-semibold">Item</th>
                  <th className="text-left p-3 border border-gray-200 font-semibold">Delivery Method</th>
                  <th className="text-left p-3 border border-gray-200 font-semibold">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Course dashboard access', 'Email (login link) + Dashboard', 'Within 30 minutes'],
                  ['Live session links', 'Email + WhatsApp', 'Before each session'],
                  ['Session recordings', 'Student dashboard', 'Within 24–48 hours of session'],
                  ['Study materials & PDFs', 'Student dashboard', 'As sessions progress'],
                  ['GST invoice', 'Email', 'Within 24 hours of payment'],
                  ['AI Certification', 'Dashboard + Email', 'Upon course completion'],
                ].map(([item, method, timeline]) => (
                  <tr key={item} className="border-b border-gray-200">
                    <td className="p-3 border border-gray-200">{item}</td>
                    <td className="p-3 border border-gray-200">{method}</td>
                    <td className="p-3 border border-gray-200">{timeline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Delayed or Missing Access</h2>
          <p>If you do not receive your welcome email or dashboard access within 60 minutes of successful payment, please:</p>
          <ol className="list-decimal pl-6 mt-2 space-y-1">
            <li>Check your spam/junk folder</li>
            <li>Verify the email address used at registration</li>
            <li>Contact us at <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a> with your name, registered email, and Razorpay payment ID</li>
          </ol>
          <p className="mt-2">We will resolve all access issues within <strong>4 business hours</strong> of receiving your query.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. No Physical Shipping</h2>
          <p>As all our products are digital, there is no physical shipping, no delivery address required, and no customs or import duties applicable. Our services are available to students across India and internationally.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact Us</h2>
          <div className="space-y-1">
            <p><strong>oStaran Edu Pvt Ltd</strong></p>
            <p>Email: <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a></p>
            <p>WhatsApp: Available via the chat widget on our website</p>
            <p>Address: Mumbai, Maharashtra, India</p>
          </div>
        </section>

      </div>
    </div>
  )
}
