import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | withArijit',
  description: 'Get in touch with the withArijit team — operated by oStaran Edu Pvt Ltd, Mumbai, India.',
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-10">We typically respond within 1 business day.</p>

      <div className="grid md:grid-cols-2 gap-10">

        {/* Contact Details */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-gray-900">Email (General &amp; Support)</p>
                <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a>
              </div>
              <div>
                <p className="font-semibold text-gray-900">WhatsApp</p>
                <a href="https://wa.me/919820XXXXXX" className="text-indigo-600 hover:underline">Chat with us on WhatsApp</a>
                <p className="text-sm text-gray-500 mt-0.5">Available Mon–Sat, 10am–6pm IST</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Refund Queries</p>
                <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a>
                <p className="text-sm text-gray-500 mt-0.5">Subject: "Refund Request — [Order ID]"</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Partner / Business Enquiries</p>
                <a href="mailto:ai@witharijit.com" className="text-indigo-600 hover:underline">ai@witharijit.com</a>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Registered Office</h2>
            <div className="text-gray-700 space-y-1">
              <p className="font-semibold">oStaran Edu Pvt Ltd</p>
              <p>Mumbai, Maharashtra</p>
              <p>India — 400001</p>
              <p className="mt-2 text-sm text-gray-500">GST registered entity. GST invoices issued for all purchases.</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Common Queries</h2>
            <ul className="space-y-3 text-gray-700">
              {[
                { label: 'Course access not received?', detail: 'Check spam folder or email us with your payment ID' },
                { label: 'Want to request a refund?', detail: 'Email us within 7 days of purchase with your order ID' },
                { label: 'Need your GST invoice?', detail: 'Invoices are emailed within 24 hours — check spam or contact us' },
                { label: 'Want to become a partner?', detail: 'Visit our Become a Partner page or email us' },
                { label: 'Technical issues with the platform?', detail: 'Email us with a screenshot and your registered email' },
              ].map(({ label, detail }) => (
                <li key={label} className="border border-gray-200 rounded-lg p-3">
                  <p className="font-semibold text-sm text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <p className="font-semibold text-indigo-900 mb-1">Response Times</p>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>📧 Email: Within 1 business day</li>
              <li>💬 WhatsApp: Within 4 business hours (Mon–Sat)</li>
              <li>🔄 Refund processing: 5–7 business days</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
