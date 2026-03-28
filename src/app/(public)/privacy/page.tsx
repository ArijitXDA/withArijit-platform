import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | withArijit',
  description: 'Privacy Policy for withArijit and oStaran Edu Pvt Ltd — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: 1 March 2025 &nbsp;|&nbsp; Effective from: 1 January 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
          <p>withArijit is an AI education platform operated by <strong>oStaran Edu Pvt Ltd</strong>, a company incorporated in India. Our registered address is Mumbai, Maharashtra, India. This Privacy Policy applies to all services offered at <strong>www.ostaran.com</strong>, <strong>www.witharijit.com</strong>, and <strong>www.aiwitharijit.com</strong> (collectively, "the Platform").</p>
          <p className="mt-2">For any privacy-related queries, contact us at: <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a></p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
          <p>We collect the following categories of personal information:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Identity data:</strong> Full name, date of birth (optional)</li>
            <li><strong>Contact data:</strong> Email address, mobile number, WhatsApp number</li>
            <li><strong>Payment data:</strong> Transaction ID, amount paid, payment method. We do not store card numbers or CVV — all payment processing is handled by Razorpay.</li>
            <li><strong>Usage data:</strong> Pages visited, course progress, session attendance, device type, IP address, browser type</li>
            <li><strong>Communications:</strong> Emails and WhatsApp messages exchanged with our support team</li>
            <li><strong>Referral data:</strong> Partner/referral codes used during registration</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
          <p>We use your personal information for the following purposes:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Creating and managing your student account</li>
            <li>Delivering course content, live sessions, and study materials</li>
            <li>Processing payments and issuing GST invoices</li>
            <li>Sending session reminders, course updates, and announcements via email and WhatsApp</li>
            <li>Issuing AI certification and course completion certificates</li>
            <li>Providing customer support and responding to queries</li>
            <li>Tracking referrals and calculating partner commissions</li>
            <li>Improving our platform, content, and services</li>
            <li>Complying with legal obligations under Indian law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis for Processing</h2>
          <p>We process your data on the following lawful bases under applicable Indian data protection law:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Contractual necessity:</strong> To fulfil the course enrolment agreement</li>
            <li><strong>Legitimate interests:</strong> Platform improvement, fraud prevention, security</li>
            <li><strong>Legal obligation:</strong> GST compliance, financial record-keeping</li>
            <li><strong>Consent:</strong> For marketing communications (you may withdraw consent at any time)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing and Disclosure</h2>
          <p>We do not sell your personal data. We share your data only in the following circumstances:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Razorpay:</strong> Payment processing (PCI-DSS compliant)</li>
            <li><strong>AiSensy / WhatsApp Business API:</strong> Session reminders and course communications</li>
            <li><strong>Email providers (Hostinger/Brevo):</strong> Transactional and marketing emails</li>
            <li><strong>Supabase:</strong> Secure cloud database hosting (your data is stored in encrypted form)</li>
            <li><strong>Partners/Referrers:</strong> We share only aggregate data (e.g., number of enrolments) with our partner network — never your personal details without your consent</li>
            <li><strong>Legal authorities:</strong> When required by law, court order, or government authority</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active and for up to 7 years after account closure for financial and legal compliance purposes. You may request deletion of your account data (subject to legal retention requirements) by emailing us.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Access a copy of your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data (right to erasure)</li>
            <li>Withdraw consent for marketing communications at any time</li>
            <li>Lodge a complaint with the relevant data protection authority</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, email us at <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
          <p>We use essential cookies for session management and authentication. We use analytics cookies (anonymised) to understand platform usage. You can disable non-essential cookies in your browser settings without affecting core platform functionality.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Security</h2>
          <p>We implement industry-standard security measures including HTTPS/TLS encryption, access controls, and secure cloud infrastructure. Payment data is handled entirely by Razorpay and is never stored on our servers. In the event of a data breach, we will notify affected users within 72 hours.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of material changes via email or a prominent notice on our website. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
          <p>For any privacy concerns or to exercise your rights, please contact:</p>
          <div className="mt-2 space-y-1">
            <p><strong>oStaran Edu Pvt Ltd</strong></p>
            <p>Email: <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a></p>
            <p>Address: Mumbai, Maharashtra, India</p>
          </div>
        </section>

      </div>
    </div>
  )
}
