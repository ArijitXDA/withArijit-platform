import type { Metadata } from 'next'
import { ContactForm } from './_components/ContactForm'
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact Us | oStaran',
  description: 'Get in touch with the oStaran team for course enquiries, corporate training, partnerships, investor relations or support. We respond within 1 business day.',
  keywords: ['contact oStaran', 'AI training enquiry', 'corporate AI training India', 'oStaran support'],
}

const CONTACT_DETAILS = [
  {
    icon: Mail,
    label: 'Email (General & Support)',
    value: 'ai@ostaran.com',
    href: 'mailto:ai@ostaran.com',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+91 99300 51053',
    href: 'https://wa.me/919930051053',
    sub: 'Mon–Sat, 10am–6pm IST',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Phone,
    label: 'Phone (Business Hours)',
    value: '+91 99300 51053',
    href: 'tel:+919930051053',
    sub: 'Mon–Sat, 10am–6pm IST',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Clock,
    label: 'Response Time',
    value: 'Within 1 Business Day',
    href: null,
    sub: 'WhatsApp: within 4 hours',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-gray-950 to-indigo-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Get in Touch</h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Whether you&apos;re a student, corporate client, investor, or partner — our team is here to help.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-5 gap-12">

          {/* ── Left: Contact details + address ─────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Contact cards */}
            {CONTACT_DETAILS.map(({ icon: Icon, label, value, href, sub, color, bg }) => (
              <div key={label} className={`flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  {href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className={`text-sm font-semibold mt-0.5 block hover:underline ${color}`}>
                      {value}
                    </a>
                  ) : (
                    <p className={`text-sm font-semibold mt-0.5 ${color}`}>{value}</p>
                  )}
                  {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}

            {/* Registered office */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50">
                  <MapPin size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registered Office</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">Star Analytix Pvt Ltd</p>
                  <p className="text-sm text-gray-600">Mira Road East</p>
                  <p className="text-sm text-gray-600">Mumbai, Maharashtra — 401107</p>
                  <p className="text-xs text-gray-400 mt-1.5">MSME & GST Registered · Invoices issued for all purchases</p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
              <p className="text-sm font-bold text-indigo-900 mb-3">Common Queries</p>
              <ul className="space-y-2 text-sm text-indigo-800">
                <li>📦 Course access issues → email with Payment ID</li>
                <li>💳 Refund requests → within 7 days of purchase</li>
                <li>🧾 GST invoice → emailed within 24h, check spam</li>
                <li>🤝 Partnership → see Become a Partner page</li>
                <li>🏢 Corporate training → fill form opposite</li>
              </ul>
            </div>
          </div>

          {/* ── Right: Smart contact form ────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Send us a message</h2>
              <p className="text-gray-500 text-sm mb-8">We typically respond within 1 business day.</p>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
